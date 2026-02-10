import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('term_results')
@Index(['studentId', 'termId', 'sessionId'])
export class TermResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  studentId: string;

  @Column()
  classId: string;

  @Column()
  termId: string;

  @Column()
  sessionId: string;

  @Column('jsonb')
  subjects: any[];

  @Column('decimal', { precision: 5, scale: 2 })
  totalScore: number;

  /** Computed academic average */
  @Column('decimal', { precision: 5, scale: 2 })
  average: number;

  /** Explicit computed average used by services */
  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  averageScore?: number;

  @Column({ type: 'int', nullable: true })
  totalSubjects?: number;

  @Column({ nullable: true })
  grade?: string;

  @Column({ type: 'int', nullable: true })
  position?: number;

  @Column({ type: 'int', nullable: true })
  totalStudents?: number;

  @Column({ nullable: true })
  remarks?: string;

  @Column({ nullable: true })
  teacherRemark?: string;

  @Column({ nullable: true })
  promotionStatus?: string;

  @Column({ type: 'timestamp', nullable: true })
  computedAt?: Date;

  @Column({ default: 'DRAFT' })
  status: string;

  @Column({ default: false })
  isPublished: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
