import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('teachers')
@Index(['tenantId', 'email'], { unique: true })
export class Teacher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'staff_id', unique: true })
  staffId: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'middle_name', nullable: true })
  middleName?: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone?: string;

  @Column()
  gender: 'MALE' | 'FEMALE';

  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth?: Date;

  @Column({ type: 'date', name: 'date_employed', nullable: true })
  dateEmployed?: Date;

  @Column({ nullable: true })
  qualification: string;

  @Column({ name: 'specialization', nullable: true })
  specialization?: string;

  @Column({ default: 'ACTIVE' })
  status: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED';

  @Column({ type: 'jsonb', nullable: true, name: 'subjects_taught' })
  subjectsTaught?: string[];

  @Column({ type: 'jsonb', nullable: true, name: 'classes_assigned' })
  classesAssigned?: string[];

  @Column({ name: 'is_class_teacher', default: false })
  isClassTeacher: boolean;

  @Column({ name: 'class_teacher_of', nullable: true })
  classTeacherOf?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true, name: 'emergency_contact' })
  emergencyContact?: string;

  @Column({ nullable: true, name: 'emergency_phone' })
  emergencyPhone?: string;

  @Column({ nullable: true, name: 'photo_url' })
  photoUrl?: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
