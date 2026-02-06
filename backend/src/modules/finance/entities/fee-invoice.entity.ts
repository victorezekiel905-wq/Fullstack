import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('fee_invoices')
@Index(['tenantId', 'studentId', 'sessionId'])
@Index(['tenantId', 'status'])
export class FeeInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'invoice_number', unique: true })
  invoiceNumber: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ name: 'session_id' })
  sessionId: string;

  @Column({ name: 'term_id', nullable: true })
  termId?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'discount_amount', default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'net_amount' })
  netAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'amount_paid', default: 0 })
  amountPaid: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'balance' })
  balance: number;

  @Column()
  status: 'DRAFT' | 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

  @Column({ type: 'jsonb', name: 'line_items' })
  lineItems: Array<{
    feeStructureId: string;
    description: string;
    amount: number;
  }>;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({ name: 'issued_date', type: 'date' })
  issuedDate: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
