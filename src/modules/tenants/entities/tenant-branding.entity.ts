import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('tenant_branding')
@Index(['tenantId'], { unique: true })
export class TenantBranding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'school_name' })
  schoolName: string;

  @Column({ name: 'school_logo', nullable: true })
  schoolLogo?: string;

  @Column({ name: 'dashboard_image', nullable: true })
  dashboardImage?: string;

  @Column({ name: 'primary_color', default: '#2563eb' })
  primaryColor: string;

  @Column({ name: 'secondary_color', default: '#7c3aed' })
  secondaryColor: string;

  @Column({ name: 'custom_domain', nullable: true })
  customDomain?: string;

  @Column({ nullable: true })
  subdomain?: string;

  @Column({ name: 'email_footer', type: 'text', nullable: true })
  emailFooter?: string;

  @Column({ name: 'whatsapp_footer', nullable: true })
  whatsappFooter?: string;

  @Column({ name: 'school_address', type: 'text', nullable: true })
  schoolAddress?: string;

  @Column({ name: 'school_phone', nullable: true })
  schoolPhone?: string;

  @Column({ name: 'school_email', nullable: true })
  schoolEmail?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'social_media' })
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    website?: string;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
