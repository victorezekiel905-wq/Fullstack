import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('dashboard_widgets')
@Index(['tenantId', 'code'], { unique: true })
export class DashboardWidget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId?: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column()
  category: 'ACADEMIC' | 'FINANCIAL' | 'ADMINISTRATIVE' | 'ANALYTICS';

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'component_name' })
  componentName: string;

  @Column({ type: 'jsonb', name: 'default_config' })
  defaultConfig: any;

  @Column({ type: 'jsonb', nullable: true, name: 'permissions_required' })
  permissionsRequired?: string[];

  @Column({ name: 'is_premium', default: false })
  isPremium: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
