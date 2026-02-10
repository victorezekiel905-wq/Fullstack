import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { DataSource } from 'typeorm';

export interface CreateTenantDto {
  name: string;
  subdomain: string;
  customDomain?: string;
  subscriptionTier: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  adminEmail: string;
  adminPassword: string;
  schoolInfo?: any;
}

@Injectable()
export class RAdminService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly dataSource: DataSource,
  ) {}

  async onboardTenant(dto: CreateTenantDto): Promise<Tenant> {
    // 1. Validate subdomain
    const existing = await this.tenantRepository.findOne({
      where: { subdomain: dto.subdomain },
    });

    if (existing) {
      throw new BadRequestException('Subdomain already taken');
    }

    // 2. Generate schema name
    const schemaName = `tenant_${dto.subdomain.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    // 3. Create tenant record
    const tenant = this.tenantRepository.create({
      name: dto.name,
      subdomain: dto.subdomain,
      customDomain: dto.customDomain,
      schemaName,
      subscriptionTier: dto.subscriptionTier,
      status: 'TRIAL',
      enabledFeatures: this.getDefaultFeatures(dto.subscriptionTier),
      maxStudents: this.getMaxStudents(dto.subscriptionTier),
      maxTeachers: this.getMaxTeachers(dto.subscriptionTier),
      maxStorageGB: this.getMaxStorage(dto.subscriptionTier),
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    const savedTenant = await this.tenantRepository.save(tenant);

    // 4. Create schema in PostgreSQL
    await this.createTenantSchema(schemaName);

    // 5. Run migrations for tenant schema
    await this.runTenantMigrations(schemaName);

    // 6. Create admin user (would call auth service)
    // await this.authService.createAdminUser(savedTenant.id, dto.adminEmail, dto.adminPassword);

    // 7. Seed default data
    await this.seedDefaultData(savedTenant.id, schemaName);

    return savedTenant;
  }

  private async createTenantSchema(schemaName: string): Promise<void> {
    await this.dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  }

  private async runTenantMigrations(schemaName: string): Promise<void> {
    // Set search_path and run migrations
    await this.dataSource.query(`SET search_path TO "${schemaName}"`);
    
    // In production, run actual migrations
    // For now, create basic tables
    // This is a simplified version - in production use TypeORM migrations
  }

  private async seedDefaultData(tenantId: string, schemaName: string): Promise<void> {
    // Seed default grading system, subjects, etc.
    // This would be implemented with actual seed scripts
  }

  private getDefaultFeatures(tier: string): string[] {
    const features = {
      BASIC: ['results', 'attendance', 'students', 'teachers'],
      PREMIUM: ['results', 'attendance', 'students', 'teachers', 'finance', 'email', 'whatsapp', 'widgets'],
      ENTERPRISE: ['results', 'attendance', 'students', 'teachers', 'finance', 'email', 'whatsapp', 'widgets', 'api', 'custom_domain', 'white_label'],
    };

    return features[tier] || features.BASIC;
  }

  private getMaxStudents(tier: string): number {
    const limits = {
      BASIC: 500,
      PREMIUM: 2000,
      ENTERPRISE: null, // Unlimited
    };

    return limits[tier];
  }

  private getMaxTeachers(tier: string): number {
    const limits = {
      BASIC: 50,
      PREMIUM: 200,
      ENTERPRISE: null, // Unlimited
    };

    return limits[tier];
  }

  private getMaxStorage(tier: string): number {
    const limits = {
      BASIC: 5,
      PREMIUM: 50,
      ENTERPRISE: null, // Unlimited
    };

    return limits[tier];
  }

  async getAllTenants(filters?: any): Promise<{ tenants: Tenant[]; total: number }> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.subscriptionTier) {
      where.subscriptionTier = filters.subscriptionTier;
    }

    const [tenants, total] = await this.tenantRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });

    return { tenants, total };
  }

  async getTenant(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
    const tenant = await this.getTenant(id);
    Object.assign(tenant, updates);
    return this.tenantRepository.save(tenant);
  }

  async suspendTenant(id: string, reason: string): Promise<Tenant> {
    const tenant = await this.getTenant(id);
    tenant.status = 'SUSPENDED';
    tenant.metadata = { ...tenant.metadata, suspensionReason: reason, suspendedAt: new Date() };
    return this.tenantRepository.save(tenant);
  }

  async activateTenant(id: string): Promise<Tenant> {
    const tenant = await this.getTenant(id);
    tenant.status = 'ACTIVE';
    return this.tenantRepository.save(tenant);
  }

  async getGlobalAnalytics(): Promise<any> {
    return this.getSystemStatistics();
  }

  async getSystemHealth(): Promise<any> {
    const stats = await this.getSystemStatistics();
    
    return {
      status: 'healthy',
      timestamp: new Date(),
      database: 'connected',
      tenants: stats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
