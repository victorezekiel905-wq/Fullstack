import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('subjects')
@Index(['tenantId', 'name'], { unique: true })
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  code?: string;

  @Column({ name: 'subject_type' })
  subjectType: 'CORE' | 'ELECTIVE' | 'VOCATIONAL' | 'EXTRA_CURRICULAR';

  @Column({ name: 'academic_level', type: 'jsonb' })
  academicLevel: ('NURSERY' | 'PRIMARY' | 'JSS' | 'SSS')[];

  @Column({ name: 'max_ca_score', default: 40 })
  maxCAScore: number;

  @Column({ name: 'max_exam_score', default: 60 })
  maxExamScore: number;

  @Column({ name: 'is_graded', default: true })
  isGraded: boolean;

  @Column({ default: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE';

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
