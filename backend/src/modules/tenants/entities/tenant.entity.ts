import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('tenants')
@Index(['subdomain'], { unique: true })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  subdomain: string;

  @Column({ name: 'custom_domain', nullable: true, unique: true })
  customDomain?: string;

  @Column({ name: 'schema_name' })
  schemaName: string;

  @Column({ name: 'subscription_tier' })
  subscriptionTier: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

  @Column({ default: 'ACTIVE' })
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | 'TRIAL';

  @Column({ type: 'jsonb', name: 'enabled_features' })
  enabledFeatures: string[];

  @Column({ name: 'max_students', nullable: true })
  maxStudents?: number;

  @Column({ name: 'max_teachers', nullable: true })
  maxTeachers?: number;

  @Column({ name: 'max_storage_gb', nullable: true })
  maxStorageGB?: number;

  @Column({ type: 'date', name: 'trial_ends_at', nullable: true })
  trialEndsAt?: Date;

  @Column({ type: 'date', name: 'subscription_ends_at', nullable: true })
  subscriptionEndsAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @Column({ name: 'onboarded_at', nullable: true })
  onboardedAt?: Date;

  @Column({ name: 'onboarded_by', nullable: true })
  onboardedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
