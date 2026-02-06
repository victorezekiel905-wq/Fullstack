import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
@Index(['tenantId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId: string;

  @Column()
  action: string; // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, ACCESS, etc.

  @Column()
  entity: string; // Student, Teacher, Result, etc.

  @Column({ name: 'entity_id', nullable: true })
  entityId: string;

  @Column({ type: 'jsonb', nullable: true })
  before: any; // State before change

  @Column({ type: 'jsonb', nullable: true })
  after: any; // State after change

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // Additional context

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  status: string; // success, failure

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Index()
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Column({ name: 'correlation_id', nullable: true })
  @Index()
  correlationId: string; // For tracking related events
}
