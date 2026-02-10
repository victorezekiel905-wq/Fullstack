import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('fee_structures')
@Index(['tenantId', 'sessionId', 'classId'])
export class FeeStructure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'session_id' })
  sessionId: string;

  @Column({ name: 'class_id', nullable: true })
  classId?: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'fee_type' })
  feeType: 'TUITION' | 'TRANSPORT' | 'UNIFORM' | 'BOOKS' | 'EXAM' | 'DEVELOPMENT' | 'OTHER';

  @Column({ name: 'payment_schedule' })
  paymentSchedule: 'FULL' | 'TERMLY' | 'MONTHLY' | 'INSTALLMENT';

  @Column({ name: 'is_mandatory', default: true })
  isMandatory: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
