import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('terms')
@Index(['tenantId', 'sessionId', 'name'], { unique: true })
export class Term {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'session_id' })
  sessionId: string;

  @Column()
  name: 'FIRST_TERM' | 'SECOND_TERM' | 'THIRD_TERM';

  @Column({ name: 'display_name' })
  displayName: string;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate: Date;

  @Column({ name: 'is_current', default: false })
  @Index()
  isCurrent: boolean;

  @Column({ default: 'ACTIVE' })
  status: 'ACTIVE' | 'COMPLETED';

  @Column({ type: 'integer', name: 'total_weeks', nullable: true })
  totalWeeks?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
