import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('message_logs')
@Index(['tenantId', 'recipientId', 'createdAt'])
@Index(['tenantId', 'status'])
export class MessageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column()
  type: 'EMAIL' | 'WHATSAPP' | 'SMS';

  @Column({ name: 'recipient_id' })
  recipientId: string;

  @Column({ name: 'recipient_type' })
  recipientType: 'STUDENT' | 'PARENT' | 'TEACHER' | 'STAFF';

  @Column({ name: 'recipient_contact' })
  recipientContact: string;

  @Column({ nullable: true })
  subject?: string;

  @Column({ type: 'text' })
  body: string;

  @Column()
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';

  @Column({ name: 'provider_message_id', nullable: true })
  providerMessageId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'sent_at', nullable: true })
  sentAt?: Date;

  @Column({ name: 'delivered_at', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'read_at', nullable: true })
  readAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
