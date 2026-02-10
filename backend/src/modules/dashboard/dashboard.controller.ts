import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('widgets/available')
  @ApiOperation({ summary: 'Get available widgets for user role' })
  async getAvailableWidgets(
    @TenantId() tenantId: string,
    @Query('role') role: string,
  ) {
    return this.dashboardService.getAvailableWidgets(tenantId, role);
  }

  @Get('layout/:dashboardType')
  @ApiOperation({ summary: 'Get user dashboard layout' })
  async getUserLayout(
    @TenantId() tenantId: string,
    @Param('dashboardType') dashboardType: 'ACADEMIC' | 'ADMINISTRATIVE' | 'FINANCIAL',
    @Query('userId') userId: string,
  ) {
    const layout = await this.dashboardService.getUserLayout(tenantId, userId, dashboardType);
    
    if (!layout) {
      // Return default layout
      const defaultLayout = await this.dashboardService.getDefaultLayout(dashboardType);
      return { layout: defaultLayout, isDefault: true };
    }

    return { layout: layout.layout, isDefault: false };
  }

  @Post('layout/:dashboardType')
  @ApiOperation({ summary: 'Save user dashboard layout' })
  async saveUserLayout(
    @TenantId() tenantId: string,
    @Param('dashboardType') dashboardType: 'ACADEMIC' | 'ADMINISTRATIVE' | 'FINANCIAL',
    @Body() body: { userId: string; layout: any },
  ) {
    return this.dashboardService.saveUserLayout(
      tenantId,
      body.userId,
      dashboardType,
      body.layout,
    );
  }

  @Get('widget-data/:widgetCode')
  @ApiOperation({ summary: 'Get widget data' })
  async getWidgetData(
    @TenantId() tenantId: string,
    @Param('widgetCode') widgetCode: string,
    @Query('config') config?: any,
  ) {
    return this.dashboardService.getWidgetData(tenantId, widgetCode, config);
  }
}
