import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { StudentScore, ResultSnapshot, TermResult } from './entities/result.entity';
import { BulkScoreEntryDto, ProcessResultsDto, PublishResultsDto, GradeRule } from './dto/result.dto';

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(StudentScore)
    private scoreRepository: Repository<StudentScore>,
    @InjectRepository(ResultSnapshot)
    private snapshotRepository: Repository<ResultSnapshot>,
    @InjectRepository(TermResult)
    private termResultRepository: Repository<TermResult>,
    private dataSource: DataSource,
    @InjectQueue('result-processing')
    private resultQueue: Queue,
  ) {}

  async bulkScoreEntry(bulkScoreDto: BulkScoreEntryDto, tenantId: string, userId: string): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const results = [];

      for (const scoreData of bulkScoreDto.scores) {
        // Validate score doesn't exceed max
        if (scoreData.score > scoreData.max_score) {
          throw new BadRequestException(`Score ${scoreData.score} exceeds maximum ${scoreData.max_score}`);
        }

        // Check if score already exists
        const existing = await this.scoreRepository.findOne({
          where: {
            tenant_id: tenantId,
            student_id: scoreData.student_id,
            class_subject_id: bulkScoreDto.class_subject_id,
            term_id: bulkScoreDto.term_id,
            assessment_type_id: bulkScoreDto.assessment_type_id,
          },
        });

        if (existing) {
          // Update existing score
          existing.score = scoreData.score;
          existing.max_score = scoreData.max_score;
          existing.entered_by = userId;
          existing.entered_at = new Date();
          await queryRunner.manager.save(existing);
          results.push(existing);
        } else {
          // Create new score
          const newScore = this.scoreRepository.create({
            tenant_id: tenantId,
            student_id: scoreData.student_id,
            class_subject_id: bulkScoreDto.class_subject_id,
            term_id: bulkScoreDto.term_id,
            assessment_type_id: bulkScoreDto.assessment_type_id,
            score: scoreData.score,
            max_score: scoreData.max_score,
            entered_by: userId,
            status: 'pending',
          });
          await queryRunner.manager.save(newScore);
          results.push(newScore);
        }
      }

      await queryRunner.commitTransaction();
      return {
        success: true,
        count: results.length,
        message: 'Scores saved successfully',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async processResults(processDto: ProcessResultsDto, tenantId: string): Promise<any> {
    // Queue the result processing job
    const job = await this.resultQueue.add('compute-results', {
      tenantId,
      termId: processDto.term_id,
      classId: processDto.class_id,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    return {
      success: true,
      jobId: job.id,
      message: 'Result processing started. This may take a few minutes.',
      statusUrl: `/api/v1/results/process/status/${job.id}`,
    };
  }

  async computeResultsWorker(data: any): Promise<void> {
    const { tenantId, termId, classId } = data;

    // Set schema context
    await this.dataSource.query(`SET search_path TO "${this.getSchemaName(tenantId)}"`);

    // Get all students in the class
    const students = await this.dataSource.query(
      `SELECT id FROM students WHERE tenant_id = $1 AND current_class_id = $2 AND status = 'active'`,
      [tenantId, classId],
    );

    // Get all subjects for the class
    const classSubjects = await this.dataSource.query(
      `SELECT id, subject_id FROM class_subjects WHERE class_id = $1`,
      [classId],
    );

    // Get grading scheme
    const gradingScheme = await this.getDefaultGradingScheme(tenantId);

    for (const student of students) {
      for (const classSubject of classSubjects) {
        await this.computeStudentSubjectResult(
          tenantId,
          student.id,
          termId,
          classId,
          classSubject.id,
          classSubject.subject_id,
          gradingScheme,
        );
      }

      // Compute overall term result for student
      await this.computeTermResult(tenantId, student.id, termId, classId);
    }

    // Compute positions
    await this.computePositions(tenantId, termId, classId);
  }

  private async computeStudentSubjectResult(
    tenantId: string,
    studentId: string,
    termId: string,
    classId: string,
    classSubjectId: string,
    subjectId: string,
    gradingScheme: GradeRule[],
  ): Promise<void> {
    // Get all scores for this student and subject
    const scores = await this.scoreRepository.find({
      where: {
        tenant_id: tenantId,
        student_id: studentId,
        class_subject_id: classSubjectId,
        term_id: termId,
      },
    });

    if (scores.length === 0) {
      return; // No scores entered yet
    }

    // Calculate CA total and exam score
    let caTotal = 0;
    let examScore = 0;

    for (const score of scores) {
      const assessmentType = await this.dataSource.query(
        `SELECT code FROM assessment_types WHERE id = $1`,
        [score.assessment_type_id],
      );

      if (assessmentType[0]?.code === 'EXAM') {
        examScore = Number(score.score);
      } else {
        caTotal += Number(score.score);
      }
    }

    const totalScore = caTotal + examScore;

    // Get grade
    const { grade, remark } = this.calculateGrade(totalScore, gradingScheme);

    // Get class statistics
    const classStats = await this.getClassStatistics(tenantId, classSubjectId, termId);

    // Check if result snapshot exists
    const existing = await this.snapshotRepository.findOne({
      where: {
        tenant_id: tenantId,
        student_id: studentId,
        term_id: termId,
        subject_id: subjectId,
      },
    });

    if (existing) {
      // Update existing
      existing.ca_total = caTotal;
      existing.exam_score = examScore;
      existing.total_score = totalScore;
      existing.grade = grade;
      existing.remark = remark;
      existing.class_average = classStats.average;
      existing.highest_score = classStats.highest;
      existing.lowest_score = classStats.lowest;
      existing.status = 'computed';
      existing.computed_at = new Date();
      await this.snapshotRepository.save(existing);
    } else {
      // Create new
      const snapshot = this.snapshotRepository.create({
        tenant_id: tenantId,
        student_id: studentId,
        term_id: termId,
        class_id: classId,
        subject_id: subjectId,
        ca_total: caTotal,
        exam_score: examScore,
        total_score: totalScore,
        grade,
        remark,
        position: 0, // Will be calculated later
        class_average: classStats.average,
        highest_score: classStats.highest,
        lowest_score: classStats.lowest,
        status: 'computed',
      });
      await this.snapshotRepository.save(snapshot);
    }
  }

  private calculateGrade(totalScore: number, gradingScheme: GradeRule[]): { grade: string; remark: string } {
    for (const rule of gradingScheme) {
      if (totalScore >= rule.min_score && totalScore <= rule.max_score) {
        return {
          grade: rule.grade,
          remark: rule.remark,
        };
      }
    }
    return { grade: 'F9', remark: 'Fail' };
  }

  private async getClassStatistics(tenantId: string, classSubjectId: string, termId: string): Promise<any> {
    const result = await this.dataSource.query(
      `SELECT 
        AVG((SELECT SUM(score) FROM student_scores WHERE student_id = s.student_id AND class_subject_id = $2 AND term_id = $3)) as average,
        MAX((SELECT SUM(score) FROM student_scores WHERE student_id = s.student_id AND class_subject_id = $2 AND term_id = $3)) as highest,
        MIN((SELECT SUM(score) FROM student_scores WHERE student_id = s.student_id AND class_subject_id = $2 AND term_id = $3)) as lowest
       FROM student_scores s
       WHERE s.class_subject_id = $2 AND s.term_id = $3
       GROUP BY s.class_subject_id`,
      [tenantId, classSubjectId, termId],
    );

    return result[0] || { average: 0, highest: 0, lowest: 0 };
  }

  private async computeTermResult(tenantId: string, studentId: string, termId: string, classId: string): Promise<void> {
    // Get all result snapshots for this student and term
    const snapshots = await this.snapshotRepository.find({
      where: {
        tenant_id: tenantId,
        student_id: studentId,
        term_id: termId,
      },
    });

    if (snapshots.length === 0) {
      return;
    }

    const totalScore = snapshots.reduce((sum, snap) => sum + Number(snap.total_score), 0);
    const totalObtainable = snapshots.length * 100; // Assuming 100 max per subject
    const average = totalScore / snapshots.length;

    // Check if term result exists
    const existing = await this.termResultRepository.findOne({
      where: {
        tenant_id: tenantId,
        student_id: studentId,
        term_id: termId,
      },
    });

    if (existing) {
      existing.total_score = totalScore;
      existing.total_obtainable = totalObtainable;
      existing.average = average;
      existing.status = 'draft';
      await this.termResultRepository.save(existing);
    } else {
      const termResult = this.termResultRepository.create({
        tenant_id: tenantId,
        student_id: studentId,
        term_id: termId,
        class_id: classId,
        total_score: totalScore,
        total_obtainable: totalObtainable,
        average,
        position: 0, // Will be calculated later
        status: 'draft',
      });
      await this.termResultRepository.save(termResult);
    }
  }

  private async computePositions(tenantId: string, termId: string, classId: string): Promise<void> {
    // Compute subject positions
    const subjects = await this.dataSource.query(
      `SELECT DISTINCT subject_id FROM result_snapshots WHERE tenant_id = $1 AND term_id = $2 AND class_id = $3`,
      [tenantId, termId, classId],
    );

    for (const subject of subjects) {
      const results = await this.snapshotRepository.find({
        where: {
          tenant_id: tenantId,
          term_id: termId,
          class_id: classId,
          subject_id: subject.subject_id,
        },
        order: {
          total_score: 'DESC',
        },
      });

      let position = 1;
      for (const result of results) {
        result.position = position++;
        await this.snapshotRepository.save(result);
      }
    }

    // Compute overall positions
    const termResults = await this.termResultRepository.find({
      where: {
        tenant_id: tenantId,
        term_id: termId,
        class_id: classId,
      },
      order: {
        average: 'DESC',
      },
    });

    let position = 1;
    for (const result of termResults) {
      result.position = position++;
      await this.termResultRepository.save(result);
    }
  }

  async getBroadsheet(termId: string, classId: string, tenantId: string): Promise<any> {
    // Get all students in class
    const students = await this.dataSource.query(
      `SELECT s.id, s.admission_number, s.first_name, s.last_name 
       FROM students s 
       WHERE s.tenant_id = $1 AND s.current_class_id = $2 AND s.status = 'active'
       ORDER BY s.first_name, s.last_name`,
      [tenantId, classId],
    );

    // Get all subjects for class
    const subjects = await this.dataSource.query(
      `SELECT DISTINCT s.id, s.name 
       FROM subjects s
       INNER JOIN class_subjects cs ON cs.subject_id = s.id
       WHERE cs.class_id = $1
       ORDER BY s.name`,
      [classId],
    );

    // Build broadsheet data
    const broadsheet = [];

    for (const student of students) {
      const studentData: any = {
        student_id: student.id,
        admission_number: student.admission_number,
        name: `${student.first_name} ${student.last_name}`,
        subjects: {},
      };

      for (const subject of subjects) {
        const result = await this.snapshotRepository.findOne({
          where: {
            tenant_id: tenantId,
            student_id: student.id,
            term_id: termId,
            subject_id: subject.id,
          },
        });

        studentData.subjects[subject.name] = result ? {
          ca: result.ca_total,
          exam: result.exam_score,
          total: result.total_score,
          grade: result.grade,
          position: result.position,
        } : null;
      }

      // Get overall result
      const termResult = await this.termResultRepository.findOne({
        where: {
          tenant_id: tenantId,
          student_id: student.id,
          term_id: termId,
        },
      });

      studentData.average = termResult?.average || 0;
      studentData.position = termResult?.position || 0;

      broadsheet.push(studentData);
    }

    return {
      subjects: subjects.map(s => s.name),
      students: broadsheet,
    };
  }

  async publishResults(publishDto: PublishResultsDto, tenantId: string): Promise<any> {
    // Update all result snapshots to published
    await this.snapshotRepository.update(
      {
        tenant_id: tenantId,
        term_id: publishDto.term_id,
        class_id: publishDto.class_id,
      },
      {
        status: 'published',
        published_at: new Date(),
      },
    );

    // Update term results to published
    await this.termResultRepository.update(
      {
        tenant_id: tenantId,
        term_id: publishDto.term_id,
        class_id: publishDto.class_id,
      },
      {
        status: 'published',
        published_at: new Date(),
      },
    );

    // Queue notification jobs if requested
    if (publishDto.send_notifications) {
      const students = await this.dataSource.query(
        `SELECT id FROM students WHERE tenant_id = $1 AND current_class_id = $2`,
        [tenantId, publishDto.class_id],
      );

      for (const student of students) {
        await this.resultQueue.add('send-result-notification', {
          tenantId,
          studentId: student.id,
          termId: publishDto.term_id,
        });
      }
    }

    return {
      success: true,
      message: 'Results published successfully',
    };
  }

  private async getDefaultGradingScheme(tenantId: string): Promise<GradeRule[]> {
    // Nigerian WAEC standard grading
    return [
      { min_score: 75, max_score: 100, grade: 'A1', remark: 'Excellent', points: 4.0 },
      { min_score: 70, max_score: 74, grade: 'B2', remark: 'Very Good', points: 3.5 },
      { min_score: 65, max_score: 69, grade: 'B3', remark: 'Good', points: 3.0 },
      { min_score: 60, max_score: 64, grade: 'C4', remark: 'Credit', points: 2.5 },
      { min_score: 55, max_score: 59, grade: 'C5', remark: 'Credit', points: 2.0 },
      { min_score: 50, max_score: 54, grade: 'C6', remark: 'Credit', points: 1.5 },
      { min_score: 45, max_score: 49, grade: 'D7', remark: 'Pass', points: 1.0 },
      { min_score: 40, max_score: 44, grade: 'E8', remark: 'Pass', points: 0.5 },
      { min_score: 0, max_score: 39, grade: 'F9', remark: 'Fail', points: 0.0 },
    ];
  }

  private getSchemaName(tenantId: string): string {
    return `tenant_${tenantId.substring(0, 8)}`;
  }
}
