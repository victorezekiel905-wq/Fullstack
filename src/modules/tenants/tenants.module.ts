import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantBranding } from './entities/tenant-branding.entity';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { BrandingService } from './services/branding.service';
import { RAdminService } from './services/r-admin.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantBranding])],
  controllers: [TenantsController],
  providers: [TenantsService, BrandingService, RAdminService],
  exports: [TenantsService, BrandingService, RAdminService],
})
export class TenantsModule {}
