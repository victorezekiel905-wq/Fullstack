import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_dashboard_layouts')
@Index(['tenantId', 'userId', 'dashboardType'], { unique: true })
export class UserDashboardLayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'dashboard_type' })
  dashboardType: 'ACADEMIC' | 'ADMINISTRATIVE' | 'FINANCIAL';

  @Column({ type: 'jsonb' })
  layout: Array<{
    widgetId: string;
    x: number;
    y: number;
    w: number;
    h: number;
    config?: any;
  }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
