import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('message_templates')
@Index(['tenantId', 'type'])
export class MessageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column()
  type: 'EMAIL' | 'WHATSAPP' | 'SMS';

  @Column()
  category: 'RESULT' | 'FEE_REMINDER' | 'ANNOUNCEMENT' | 'ADMISSION' | 'GENERAL';

  @Column({ name: 'subject', nullable: true })
  subject?: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', nullable: true })
  variables: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
