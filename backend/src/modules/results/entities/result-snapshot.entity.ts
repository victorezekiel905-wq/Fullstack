import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('result_snapshots')
@Index(['studentId', 'classId', 'termId', 'sessionId'])
export class ResultSnapshot {
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
  subjectResults: any[];

  @Column('decimal', { precision: 5, scale: 2 })
  totalScore: number;

  @Column('decimal', { precision: 5, scale: 2 })
  averageScore: number;

  @Column({ nullable: true })
  grade?: string;

  @Column({ type: 'int', nullable: true })
  position?: number;

  @Column({ default: false })
  isPublished: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
