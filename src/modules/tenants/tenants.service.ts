import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async resolveTenant(identifier: string): Promise<Tenant | null> {
    // Try subdomain first
    let tenant = await this.tenantRepository.findOne({
      where: { subdomain: identifier },
    });

    // Try custom domain
    if (!tenant) {
      tenant = await this.tenantRepository.findOne({
        where: { customDomain: identifier },
      });
    }

    return tenant;
  }

  async createTenant(data: {
    name: string;
    subdomain: string;
    subscriptionTier: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
    onboardedBy: string;
  }): Promise<Tenant> {
    const schemaName = `tenant_${data.subdomain.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    // Check if schema already exists
    const existing = await this.tenantRepository.findOne({
      where: [
        { subdomain: data.subdomain },
        { schemaName },
      ],
    });

    if (existing) {
      throw new BadRequestException('Tenant with this subdomain already exists');
    }

    // Create tenant schema
    await this.createTenantSchema(schemaName);

    // Create tenant record
    const tenant = this.tenantRepository.create({
      ...data,
      schemaName,
      status: 'TRIAL',
      enabledFeatures: this.getDefaultFeatures(data.subscriptionTier),
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      onboardedAt: new Date(),
    });

    return this.tenantRepository.save(tenant);
  }

  private async createTenantSchema(schemaName: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    
    try {
      // Create schema
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

      // Enable Row Level Security
      await queryRunner.query(`ALTER SCHEMA "${schemaName}" OWNER TO ${this.dataSource.options.username || 'postgres'}`);

      // Copy table structure from public schema to tenant schema
      const tables = [
        'users',
        'students',
        'teachers',
        'classes',
        'subjects',
        'academic_sessions',
        'terms',
        'results',
        'fee_structures',
        'fee_invoices',
        'fee_payments',
        'attendance_records',
        'message_templates',
        'message_logs',
        'audit_logs',
        'dashboard_widgets',
      ];

      for (const table of tables) {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "${schemaName}".${table} 
          (LIKE public.${table} INCLUDING ALL)
        `);
      }

      // Enable RLS on tenant tables
      for (const table of tables) {
        await queryRunner.query(`
          ALTER TABLE "${schemaName}".${table} ENABLE ROW LEVEL SECURITY
        `);
      }

    } finally {
      await queryRunner.release();
    }
  }

  private getDefaultFeatures(tier: string): string[] {
    const features = {
      BASIC: ['students', 'results', 'fees', 'sms'],
      PREMIUM: ['students', 'results', 'fees', 'sms', 'email', 'attendance', 'reports'],
      ENTERPRISE: [
        'students', 
        'results', 
        'fees', 
        'sms', 
        'email', 
        'whatsapp', 
        'attendance', 
        'reports', 
        'analytics', 
        'api_access',
        'custom_branding',
        'priority_support'
      ],
    };

    return features[tier] || features.BASIC;
  }

  async suspendTenant(tenantId: string): Promise<void> {
    await this.tenantRepository.update(tenantId, { status: 'SUSPENDED' });
  }

  async activateTenant(tenantId: string): Promise<void> {
    await this.tenantRepository.update(tenantId, { status: 'ACTIVE' });
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find();
  }

  async updateSubscription(
    tenantId: string,
    tier: 'BASIC' | 'PREMIUM' | 'ENTERPRISE',
  ): Promise<Tenant> {
    const tenant = await this.findById(tenantId);
    tenant.subscriptionTier = tier;
    tenant.enabledFeatures = this.getDefaultFeatures(tier);
    return this.tenantRepository.save(tenant);
  }
}
