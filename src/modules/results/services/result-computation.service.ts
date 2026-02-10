import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StudentScore } from '../entities/student-score.entity';
import { ResultSnapshot } from '../entities/result-snapshot.entity';
import { TermResult } from '../entities/term-result.entity';
import { GradeCalculatorService } from './grade-calculator.service';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

export interface ComputeResultDto {
  termId: string;
  classId: string;
  studentIds?: string[];
}

export interface ResultComputationProgress {
  total: number;
  processed: number;
  failed: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errors: string[];
}

@Injectable()
export class ResultComputationService {
  private readonly logger = new Logger(ResultComputationService.name);

  constructor(
    @InjectRepository(StudentScore)
    private readonly scoreRepository: Repository<StudentScore>,
    @InjectRepository(ResultSnapshot)
    private readonly snapshotRepository: Repository<ResultSnapshot>,
    @InjectRepository(TermResult)
    private readonly termResultRepository: Repository<TermResult>,
    private readonly gradeCalculator: GradeCalculatorService,
    @InjectQueue('results') private readonly resultsQueue: Queue,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Trigger result computation for a class/term (async via queue)
   */
  async triggerComputation(dto: ComputeResultDto): Promise<{ jobId: string }> {
    this.logger.log(`Triggering result computation for term=${dto.termId}, class=${dto.classId}`);

    const job = await this.resultsQueue.add('compute-results', dto, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return { jobId: job.id.toString() };
  }

  /**
   * Main computation logic (executed by worker)
   */
  async computeResults(dto: ComputeResultDto): Promise<ResultComputationProgress> {
    const { termId, classId, studentIds } = dto;

    this.logger.log(`Starting result computation: term=${termId}, class=${classId}`);

    const progress: ResultComputationProgress = {
      total: 0,
      processed: 0,
      failed: 0,
      status: 'PROCESSING',
      errors: [],
    };

    // Use transaction for data consistency
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Get all students
      let query = this.scoreRepository
        .createQueryBuilder('score')
        .select('DISTINCT score.student_id', 'studentId')
        .where('score.term_id = :termId', { termId })
        .andWhere('score.class_id = :classId', { classId });

      if (studentIds && studentIds.length > 0) {
        query = query.andWhere('score.student_id IN (:...studentIds)', { studentIds });
      }

      const students = await query.getRawMany();
      progress.total = students.length;

      this.logger.log(`Processing ${progress.total} students`);

      // 2. Calculate class positions first
      const classPositions = await this.gradeCalculator.calculatePositions(termId, classId);

      // 3. Process each student
      for (const student of students) {
        try {
          await this.computeStudentResult(
            queryRunner,
            termId,
            classId,
            student.studentId,
            classPositions,
          );
          progress.processed++;
        } catch (error) {
          progress.failed++;
          progress.errors.push(`Student ${student.studentId}: ${error.message}`);
          this.logger.error(`Failed to compute result for student ${student.studentId}`, error);
        }
      }

      // 4. Commit transaction
      await queryRunner.commitTransaction();

      progress.status = progress.failed === 0 ? 'COMPLETED' : 'COMPLETED';
      this.logger.log(`Result computation completed: ${progress.processed}/${progress.total} successful`);

      return progress;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      progress.status = 'FAILED';
      progress.errors.push(`Transaction failed: ${error.message}`);
      this.logger.error('Result computation failed', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Compute result for a single student
   */
  private async computeStudentResult(
    queryRunner: any,
    termId: string,
    classId: string,
    studentId: string,
    classPositions: Map<string, number>,
  ): Promise<void> {
    // 1. Get all scores for the student
    const scores = await this.scoreRepository.find({
      where: { termId, classId, studentId },
    });

    if (scores.length === 0) {
      throw new Error('No scores found for student');
    }

    // 2. Process each subject
    let totalScore = 0;
    let totalPoints = 0;
    let subjectCount = 0;
    let failedSubjects = 0;

    const subjectResults = [];

    for (const score of scores) {
      // Calculate grade
      const gradeConfig = this.gradeCalculator.computeGrade(score.total);
      score.grade = gradeConfig.grade;
      score.remark = gradeConfig.remark;

      // Calculate subject position
      const subjectPositions = await this.gradeCalculator.calculateSubjectPositions(
        termId,
        classId,
        score.subjectId,
      );
      score.position = subjectPositions.get(studentId) || 0;

      // Calculate class average
      score.classAverage = await this.gradeCalculator.calculateClassAverage(
        termId,
        classId,
        score.subjectId,
      );

      // Update score
      await queryRunner.manager.save(StudentScore, score);

      // Accumulate
      totalScore += score.total;
      totalPoints += gradeConfig.points;
      subjectCount++;

      if (gradeConfig.grade === 'F9') {
        failedSubjects++;
      }

      subjectResults.push({
        subjectId: score.subjectId,
        total: score.total,
        grade: score.grade,
        position: score.position,
      });
    }

    // 3. Calculate overall metrics
    const averageScore = totalScore / subjectCount;
    const averageGrade = this.gradeCalculator.computeGrade(averageScore);
    const classPosition = classPositions.get(studentId) || 0;

    // 4. Calculate statistics
    const stats = await this.gradeCalculator.calculateTermStatistics(termId, classId);

    // 5. Determine promotion status
    const promotionStatus = this.gradeCalculator.determinePromotionStatus(
      averageScore,
      failedSubjects,
      subjectCount,
    );

    // 6. Generate remark
    const teacherRemark = this.gradeCalculator.generateAutomatedRemark(
      averageScore,
      classPosition,
      stats.totalStudents,
    );

    // 7. Create/Update TermResult
    let termResult = await this.termResultRepository.findOne({
      where: { termId, studentId },
    });

    if (!termResult) {
      termResult = this.termResultRepository.create({
        termId,
        studentId,
        classId,
      });
    }

    termResult.totalScore = totalScore;
    termResult.averageScore = averageScore;
    termResult.totalSubjects = subjectCount;
    termResult.grade = averageGrade.grade;
    termResult.position = classPosition;
    termResult.totalStudents = stats.totalStudents;
    termResult.promotionStatus = promotionStatus;
    termResult.teacherRemark = teacherRemark;
    termResult.computedAt = new Date();

    await queryRunner.manager.save(TermResult, termResult);

    // 8. Create ResultSnapshot for audit trail
    const snapshot = this.snapshotRepository.create({
      termId,
      studentId,
      classId,
      snapshotData: {
        scores: subjectResults,
        totalScore,
        averageScore,
        grade: averageGrade.grade,
        position: classPosition,
        totalStudents: stats.totalStudents,
        promotionStatus,
        computedAt: new Date().toISOString(),
      },
    });

    await queryRunner.manager.save(ResultSnapshot, snapshot);

    this.logger.debug(`Computed result for student ${studentId}: avg=${averageScore.toFixed(2)}, pos=${classPosition}`);
  }

  /**
   * Get computation progress
   */
  async getComputationProgress(jobId: string): Promise<any> {
    const job = await this.resultsQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      jobId,
      state,
      progress,
      result: await job.finished().catch(() => null),
    };
  }

  /**
   * Publish results (make visible to students/parents)
   */
  async publishResults(termId: string, classId: string): Promise<void> {
    this.logger.log(`Publishing results for term=${termId}, class=${classId}`);

    const results = await this.termResultRepository.find({
      where: { termId, classId, status: 'COMPUTED' },
    });

    if (results.length === 0) {
      throw new BadRequestException('No computed results found to publish');
    }

    // Update status to PUBLISHED
    for (const result of results) {
      result.status = 'PUBLISHED';
      result.publishedAt = new Date();
    }

    await this.termResultRepository.save(results);

    // Trigger notification queue
    await this.resultsQueue.add('notify-results-published', {
      termId,
      classId,
      studentIds: results.map((r) => r.studentId),
    });

    this.logger.log(`Published ${results.length} results`);
  }

  /**
   * Unpublish results (revert to computed state)
   */
  async unpublishResults(termId: string, classId: string): Promise<void> {
    const results = await this.termResultRepository.find({
      where: { termId, classId, status: 'PUBLISHED' },
    });

    for (const result of results) {
      result.status = 'COMPUTED';
      result.publishedAt = null;
    }

    await this.termResultRepository.save(results);
    this.logger.log(`Unpublished ${results.length} results`);
  }
}
