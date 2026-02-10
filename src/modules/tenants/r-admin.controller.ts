import { Controller, Post, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RAdminService } from './services/r-admin.service';
import { TenantsService } from './tenants.service';

@ApiTags('R-Admin')
@ApiBearerAuth()
@Controller('r-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class RAdminController {
  constructor(
    private readonly rAdminService: RAdminService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Post('tenants')
  async onboardTenant(
    @Body()
    data: {
      name: string;
      subdomain: string;
      subscriptionTier: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
      adminEmail: string;
      adminPassword: string;
      adminFirstName: string;
      adminLastName: string;
    },
  ) {
    return this.rAdminService.onboardTenant(data);
  }

  @Get('tenants')
  async getAllTenants() {
    return this.tenantsService.findAll();
  }

  @Get('tenants/:id')
  async getTenant(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }

  @Patch('tenants/:id/suspend')
  async suspendTenant(@Param('id') id: string) {
    await this.tenantsService.suspendTenant(id);
    return { message: 'Tenant suspended successfully' };
  }

  @Patch('tenants/:id/activate')
  async activateTenant(@Param('id') id: string) {
    await this.tenantsService.activateTenant(id);
    return { message: 'Tenant activated successfully' };
  }

  @Patch('tenants/:id/subscription')
  async updateSubscription(
    @Param('id') id: string,
    @Body() data: { tier: 'BASIC' | 'PREMIUM' | 'ENTERPRISE' },
  ) {
    return this.tenantsService.updateSubscription(id, data.tier);
  }

  @Get('analytics')
  async getGlobalAnalytics() {
    return this.rAdminService.getGlobalAnalytics();
  }

  @Get('health')
  async getSystemHealth() {
    return this.rAdminService.getSystemHealth();
  }
}
