import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('attendance')
@Index(['tenantId', 'studentId', 'date'])
@Index(['tenantId', 'classId', 'date'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ name: 'class_id' })
  classId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column()
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @Column({ name: 'marked_by' })
  markedBy: string;

  @Column({ name: 'marked_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  markedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
