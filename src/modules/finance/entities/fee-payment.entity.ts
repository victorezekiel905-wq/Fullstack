import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('fee_payments')
@Index(['tenantId', 'invoiceId'])
@Index(['tenantId', 'studentId', 'paymentDate'])
export class FeePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'receipt_number', unique: true })
  receiptNumber: string;

  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'payment_method' })
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'MOBILE_MONEY' | 'CHEQUE' | 'POS';

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: Date;

  @Column({ name: 'reference_number', nullable: true })
  referenceNumber?: string;

  @Column({ name: 'collected_by' })
  collectedBy: string;

  @Column({ default: 'COMPLETED' })
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata' })
  metadata?: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
