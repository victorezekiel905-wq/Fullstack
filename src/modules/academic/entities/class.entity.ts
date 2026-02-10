import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('classes')
@Index(['tenantId', 'name', 'academicYear'], { unique: true })
export class Class {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  @Column({ name: 'academic_level' })
  academicLevel: 'NURSERY' | 'PRIMARY' | 'JSS' | 'SSS';

  @Column({ name: 'class_category', nullable: true })
  classCategory?: string;

  @Column({ name: 'academic_year' })
  academicYear: string;

  @Column({ name: 'class_teacher_id', nullable: true })
  classTeacherId?: string;

  @Column({ name: 'max_students', nullable: true, default: 40 })
  maxStudents?: number;

  @Column({ name: 'current_students', default: 0 })
  currentStudents: number;

  @Column({ type: 'jsonb', nullable: true, name: 'subjects' })
  subjects?: string[];

  @Column({ default: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
