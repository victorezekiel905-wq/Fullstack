import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BrandingService, UpdateBrandingDto } from './services/branding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('Tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly brandingService: BrandingService) {}

  @Get('branding')
  @ApiOperation({ summary: 'Get tenant branding' })
  async getBranding(@TenantId() tenantId: string) {
    return this.brandingService.getTenantBranding(tenantId);
  }

  @Put('branding')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update tenant branding' })
  async updateBranding(
    @TenantId() tenantId: string,
    @Body() dto: UpdateBrandingDto,
  ) {
    return this.brandingService.updateBranding(tenantId, dto);
  }

  @Get('branding/subdomain/:subdomain')
  @ApiOperation({ summary: 'Get branding by subdomain (public)' })
  async getBrandingBySubdomain(@Param('subdomain') subdomain: string) {
    return this.brandingService.getBrandingBySubdomain(subdomain);
  }

  @Get('branding/domain/:domain')
  @ApiOperation({ summary: 'Get branding by custom domain (public)' })
  async getBrandingByDomain(@Param('domain') domain: string) {
    return this.brandingService.getBrandingByDomain(domain);
  }
}
