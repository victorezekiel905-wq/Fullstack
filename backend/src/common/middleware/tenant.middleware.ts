import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantsService } from '@modules/tenants/tenants.service';
import { DataSource } from 'typeorm';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly dataSource: DataSource,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract tenant identifier from:
      // 1. Subdomain (e.g., greenfield.synergyswift.ng)
      // 2. Custom domain (e.g., portal.greenfield.edu.ng)
      // 3. Header (X-Tenant-Subdomain)
      
      let tenantIdentifier: string;

      // Check header first (for API calls)
      if (req.headers['x-tenant-subdomain']) {
        tenantIdentifier = req.headers['x-tenant-subdomain'] as string;
      } else {
        // Extract from hostname
        const hostname = req.hostname;
        const parts = hostname.split('.');
        
        // If subdomain.synergyswift.ng format
        if (parts.length >= 3 && parts[parts.length - 2] === 'synergyswift') {
          tenantIdentifier = parts[0];
        } else {
          // Custom domain - lookup by domain
          tenantIdentifier = hostname;
        }
      }

      if (!tenantIdentifier || tenantIdentifier === 'www' || tenantIdentifier === 'api') {
        throw new UnauthorizedException('Tenant not specified');
      }

      // Resolve tenant from database
      const tenant = await this.tenantsService.resolveTenant(tenantIdentifier);

      if (!tenant) {
        throw new UnauthorizedException('Invalid tenant');
      }

      if (tenant.status !== 'active') {
        throw new UnauthorizedException('Tenant account is suspended');
      }

      // Attach tenant info to request
      req['tenantId'] = tenant.id;
      req['schemaName'] = tenant.schema_name;
      req['tenant'] = tenant;

      // Set PostgreSQL search_path to tenant schema
      await this.dataSource.query(`SET search_path TO "${tenant.schema_name}"`);

      next();
    } catch (error) {
      throw new UnauthorizedException('Tenant resolution failed');
    }
  }
}
