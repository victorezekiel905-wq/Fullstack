import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('student_scores')
@Index(['tenant_id', 'student_id', 'term_id', 'class_subject_id', 'assessment_type_id'], { unique: true })
export class StudentScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  student_id: string;

  @Column({ type: 'uuid' })
  class_subject_id: string;

  @Column({ type: 'uuid' })
  term_id: string;

  @Column({ type: 'uuid' })
  assessment_type_id: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  score: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  max_score: number;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ type: 'uuid', nullable: true })
  entered_by: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  entered_at: Date;

  @Column({ length: 20, default: 'pending' })
  status: string; // pending, verified, published

  @CreateDateColumn()
  created_at: Date;
}

@Entity('result_snapshots')
@Index(['tenant_id', 'student_id', 'term_id', 'subject_id'], { unique: true })
export class ResultSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  student_id: string;

  @Column({ type: 'uuid' })
  term_id: string;

  @Column({ type: 'uuid' })
  class_id: string;

  @Column({ type: 'uuid' })
  subject_id: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  ca_total: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  exam_score: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  total_score: number;

  @Column({ length: 5 })
  grade: string;

  @Column({ length: 100 })
  remark: string;

  @Column({ type: 'integer' })
  position: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  class_average: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  highest_score: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  lowest_score: number;

  @Column({ length: 20, default: 'computed' })
  status: string; // computed, published

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  computed_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  published_at: Date;
}

@Entity('term_results')
@Index(['tenant_id', 'student_id', 'term_id'], { unique: true })
export class TermResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  student_id: string;

  @Column({ type: 'uuid' })
  term_id: string;

  @Column({ type: 'uuid' })
  class_id: string;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  total_score: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  total_obtainable: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  average: number;

  @Column({ type: 'integer' })
  position: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  gpa: number;

  @Column({ type: 'integer', nullable: true })
  attendance_days: number;

  @Column({ type: 'integer', nullable: true })
  total_school_days: number;

  @Column({ type: 'text', nullable: true })
  principal_comment: string;

  @Column({ type: 'text', nullable: true })
  class_teacher_comment: string;

  @Column({ length: 20, default: 'draft' })
  status: string; // draft, published

  @Column({ type: 'timestamp', nullable: true })
  published_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
