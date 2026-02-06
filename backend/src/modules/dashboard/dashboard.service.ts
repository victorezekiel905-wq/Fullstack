import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DashboardWidget } from '../entities/dashboard-widget.entity';
import { UserDashboardLayout } from '../entities/user-dashboard-layout.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(DashboardWidget)
    private readonly widgetRepository: Repository<DashboardWidget>,
    @InjectRepository(UserDashboardLayout)
    private readonly layoutRepository: Repository<UserDashboardLayout>,
  ) {}

  async getAvailableWidgets(tenantId: string, userRole: string): Promise<DashboardWidget[]> {
    const widgets = await this.widgetRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });

    // Filter by permissions (simplified - in production, use proper RBAC)
    return widgets.filter((widget) => {
      if (!widget.permissionsRequired || widget.permissionsRequired.length === 0) {
        return true;
      }
      return widget.permissionsRequired.includes(userRole);
    });
  }

  async getUserLayout(
    tenantId: string,
    userId: string,
    dashboardType: 'ACADEMIC' | 'ADMINISTRATIVE' | 'FINANCIAL',
  ): Promise<UserDashboardLayout | null> {
    return this.layoutRepository.findOne({
      where: { tenantId, userId, dashboardType },
    });
  }

  async saveUserLayout(
    tenantId: string,
    userId: string,
    dashboardType: 'ACADEMIC' | 'ADMINISTRATIVE' | 'FINANCIAL',
    layout: any,
  ): Promise<UserDashboardLayout> {
    let userLayout = await this.getUserLayout(tenantId, userId, dashboardType);

    if (!userLayout) {
      userLayout = this.layoutRepository.create({
        tenantId,
        userId,
        dashboardType,
        layout,
      });
    } else {
      userLayout.layout = layout;
    }

    return this.layoutRepository.save(userLayout);
  }

  async getDefaultLayout(dashboardType: 'ACADEMIC' | 'ADMINISTRATIVE' | 'FINANCIAL'): Promise<any> {
    // Return default widget layouts based on dashboard type
    const defaultLayouts = {
      ACADEMIC: [
        { widgetId: 'students-present-today', x: 0, y: 0, w: 3, h: 2 },
        { widgetId: 'upcoming-birthdays', x: 3, y: 0, w: 3, h: 2 },
        { widgetId: 'class-average-trends', x: 0, y: 2, w: 6, h: 3 },
        { widgetId: 'teacher-performance', x: 0, y: 5, w: 6, h: 3 },
      ],
      ADMINISTRATIVE: [
        { widgetId: 'total-students', x: 0, y: 0, w: 2, h: 2 },
        { widgetId: 'total-teachers', x: 2, y: 0, w: 2, h: 2 },
        { widgetId: 'total-classes', x: 4, y: 0, w: 2, h: 2 },
        { widgetId: 'student-enrollment-trends', x: 0, y: 2, w: 6, h: 3 },
      ],
      FINANCIAL: [
        { widgetId: 'fee-collection-today', x: 0, y: 0, w: 3, h: 2 },
        { widgetId: 'outstanding-fees', x: 3, y: 0, w: 3, h: 2 },
        { widgetId: 'collection-vs-target', x: 0, y: 2, w: 6, h: 3 },
        { widgetId: 'payment-method-breakdown', x: 0, y: 5, w: 6, h: 3 },
      ],
    };

    return defaultLayouts[dashboardType] || [];
  }

  async getWidgetData(tenantId: string, widgetCode: string, config?: any): Promise<any> {
    // This would fetch actual data for each widget
    // Placeholder implementation - in production, call appropriate services
    const widgetDataHandlers = {
      'students-present-today': () => ({
        present: 450,
        total: 500,
        percentage: 90,
      }),
      'fee-collection-today': () => ({
        collected: 250000,
        target: 300000,
        percentage: 83.3,
      }),
      'upcoming-birthdays': () => ([
        { name: 'John Doe', date: '2026-02-05', class: 'JSS 1A' },
        { name: 'Jane Smith', date: '2026-02-07', class: 'SSS 2B' },
      ]),
      // Add more widget data handlers...
    };

    const handler = widgetDataHandlers[widgetCode];
    return handler ? handler() : { message: 'Widget data not available' };
  }
}
