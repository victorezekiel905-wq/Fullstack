import { Controller, Get, Post, Query, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get audit logs' })
  async getLogs(
    @TenantId() tenantId: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.auditService.findAll(tenantId, {
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      limit,
      offset,
    });
  }

  @Get('entity/:entityType/:entityId')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get entity history' })
  async getEntityHistory(
    @TenantId() tenantId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getEntityHistory(tenantId, entityType, entityId);
  }

  @Get('user/:userId')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get user activity' })
  async getUserActivity(
    @TenantId() tenantId: string,
    @Param('userId') userId: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    return this.auditService.getUserActivity(tenantId, userId, startDate, endDate);
  }

  @Get('statistics')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get audit statistics' })
  async getStatistics(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.auditService.getStatistics(tenantId, startDate, endDate);
  }
}
