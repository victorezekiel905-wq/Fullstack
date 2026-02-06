import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentScore } from '../entities/student-score.entity';
import { ResultSnapshot } from '../entities/result-snapshot.entity';
import { TermResult } from '../entities/term-result.entity';

export interface GradeConfig {
  grade: string;
  minScore: number;
  maxScore: number;
  remark: string;
  points: number;
}

export interface ScoreValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ComputedResult {
  studentId: string;
  subjectId: string;
  totalScore: number;
  grade: string;
  points: number;
  remark: string;
  position?: number;
}

@Injectable()
export class GradeCalculatorService {
  // Nigerian WAEC/NECO Standard Grading System
  private readonly NIGERIAN_GRADES: GradeConfig[] = [
    { grade: 'A1', minScore: 80, maxScore: 100, remark: 'Excellent', points: 9 },
    { grade: 'B2', minScore: 70, maxScore: 79, remark: 'Very Good', points: 8 },
    { grade: 'B3', minScore: 65, maxScore: 69, remark: 'Good', points: 7 },
    { grade: 'C4', minScore: 60, maxScore: 64, remark: 'Credit', points: 6 },
    { grade: 'C5', minScore: 55, maxScore: 59, remark: 'Credit', points: 5 },
    { grade: 'C6', minScore: 50, maxScore: 54, remark: 'Credit', points: 4 },
    { grade: 'D7', minScore: 45, maxScore: 49, remark: 'Pass', points: 3 },
    { grade: 'E8', minScore: 40, maxScore: 44, remark: 'Pass', points: 2 },
    { grade: 'F9', minScore: 0, maxScore: 39, remark: 'Fail', points: 1 },
  ];

  constructor(
    @InjectRepository(StudentScore)
    private readonly scoreRepository: Repository<StudentScore>,
  ) {}

  /**
   * Validate scores against max marks
   */
  validateScores(
    ca: number,
    exam: number,
    maxCA: number,
    maxExam: number,
  ): ScoreValidationResult {
    const errors: string[] = [];

    if (ca < 0 || ca > maxCA) {
      errors.push(`CA score must be between 0 and ${maxCA}`);
    }

    if (exam < 0 || exam > maxExam) {
      errors.push(`Exam score must be between 0 and ${maxExam}`);
    }

    if (!Number.isInteger(ca) || !Number.isInteger(exam)) {
      errors.push('Scores must be whole numbers');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Compute total score and grade
   */
  computeGrade(totalScore: number): GradeConfig {
    const grade = this.NIGERIAN_GRADES.find(
      (g) => totalScore >= g.minScore && totalScore <= g.maxScore,
    );

    if (!grade) {
      // Fallback for edge cases
      return this.NIGERIAN_GRADES[this.NIGERIAN_GRADES.length - 1];
    }

    return grade;
  }

  /**
   * Normalize score to 100 scale
   */
  normalizeScore(score: number, maxScore: number): number {
    if (maxScore === 0) return 0;
    return Math.round((score / maxScore) * 100);
  }

  /**
   * Calculate class position based on total scores
   */
  async calculatePositions(
    termId: string,
    classId: string,
  ): Promise<Map<string, number>> {
    const scores = await this.scoreRepository
      .createQueryBuilder('score')
      .select('score.student_id', 'studentId')
      .addSelect('SUM(score.total)', 'totalScore')
      .where('score.term_id = :termId', { termId })
      .andWhere('score.class_id = :classId', { classId })
      .groupBy('score.student_id')
      .orderBy('totalScore', 'DESC')
      .getRawMany();

    const positionMap = new Map<string, number>();
    let currentPosition = 1;
    let previousScore = null;
    let studentsWithSameScore = 0;

    for (const score of scores) {
      if (previousScore !== null && score.totalScore < previousScore) {
        currentPosition += studentsWithSameScore;
        studentsWithSameScore = 1;
      } else {
        studentsWithSameScore++;
      }

      positionMap.set(score.studentId, currentPosition);
      previousScore = score.totalScore;
    }

    return positionMap;
  }

  /**
   * Calculate subject position
   */
  async calculateSubjectPositions(
    termId: string,
    classId: string,
    subjectId: string,
  ): Promise<Map<string, number>> {
    const scores = await this.scoreRepository
      .createQueryBuilder('score')
      .select('score.student_id', 'studentId')
      .addSelect('score.total', 'total')
      .where('score.term_id = :termId', { termId })
      .andWhere('score.class_id = :classId', { classId })
      .andWhere('score.subject_id = :subjectId', { subjectId })
      .orderBy('score.total', 'DESC')
      .getRawMany();

    const positionMap = new Map<string, number>();
    let currentPosition = 1;
    let previousScore = null;
    let studentsWithSameScore = 0;

    for (const score of scores) {
      if (previousScore !== null && score.total < previousScore) {
        currentPosition += studentsWithSameScore;
        studentsWithSameScore = 1;
      } else {
        studentsWithSameScore++;
      }

      positionMap.set(score.studentId, currentPosition);
      previousScore = score.total;
    }

    return positionMap;
  }

  /**
   * Calculate class averages
   */
  async calculateClassAverage(
    termId: string,
    classId: string,
    subjectId: string,
  ): Promise<number> {
    const result = await this.scoreRepository
      .createQueryBuilder('score')
      .select('AVG(score.total)', 'average')
      .where('score.term_id = :termId', { termId })
      .andWhere('score.class_id = :classId', { classId })
      .andWhere('score.subject_id = :subjectId', { subjectId })
      .getRawOne();

    return result?.average ? parseFloat(result.average) : 0;
  }

  /**
   * Calculate overall statistics
   */
  async calculateTermStatistics(termId: string, classId: string) {
    const stats = await this.scoreRepository
      .createQueryBuilder('score')
      .select('COUNT(DISTINCT score.student_id)', 'totalStudents')
      .addSelect('AVG(score.total)', 'averageScore')
      .addSelect('MAX(score.total)', 'highestScore')
      .addSelect('MIN(score.total)', 'lowestScore')
      .where('score.term_id = :termId', { termId })
      .andWhere('score.class_id = :classId', { classId })
      .getRawOne();

    return {
      totalStudents: parseInt(stats.totalStudents, 10) || 0,
      averageScore: parseFloat(stats.averageScore) || 0,
      highestScore: parseFloat(stats.highestScore) || 0,
      lowestScore: parseFloat(stats.lowestScore) || 0,
    };
  }

  /**
   * Determine promotion status
   */
  determinePromotionStatus(
    averageScore: number,
    failedSubjects: number,
    totalSubjects: number,
  ): 'PROMOTED' | 'REPEAT' | 'PROMOTED_ON_TRIAL' {
    if (averageScore >= 50 && failedSubjects === 0) {
      return 'PROMOTED';
    }

    if (averageScore >= 45 && failedSubjects <= 2 && failedSubjects / totalSubjects <= 0.25) {
      return 'PROMOTED_ON_TRIAL';
    }

    return 'REPEAT';
  }

  /**
   * Generate automated remark based on performance
   */
  generateAutomatedRemark(averageScore: number, position: number, totalStudents: number): string {
    let remark = '';

    // Performance-based remark
    if (averageScore >= 80) {
      remark = 'Excellent performance. Keep up the outstanding work!';
    } else if (averageScore >= 70) {
      remark = 'Very good performance. Continue to strive for excellence.';
    } else if (averageScore >= 60) {
      remark = 'Good performance. There is room for improvement.';
    } else if (averageScore >= 50) {
      remark = 'Fair performance. More effort is required.';
    } else if (averageScore >= 40) {
      remark = 'Weak performance. Considerable improvement needed.';
    } else {
      remark = 'Poor performance. Urgent attention required.';
    }

    // Position-based addition
    const topPercentile = totalStudents * 0.1;
    if (position <= topPercentile) {
      remark += ' Excellent class standing.';
    }

    return remark;
  }
}
