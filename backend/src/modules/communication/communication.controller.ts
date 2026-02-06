import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService, SendNotificationDto, BulkNotificationDto } from './services/notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('Communication')
@Controller('communication')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CommunicationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('notifications/send')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Send single notification' })
  async sendNotification(@Body() dto: SendNotificationDto) {
    return this.notificationService.sendNotification(dto);
  }

  @Post('notifications/bulk')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Send bulk notifications' })
  async sendBulk(@Body() dto: BulkNotificationDto) {
    return this.notificationService.sendBulkNotifications(dto);
  }

  @Get('notifications/history/:recipientId')
  @Roles('admin', 'teacher', 'parent')
  @ApiOperation({ summary: 'Get notification history' })
  async getHistory(
    @TenantId() tenantId: string,
    @Param('recipientId') recipientId: string,
  ) {
    return this.notificationService.getNotificationHistory(tenantId, recipientId);
  }

  @Get('notifications/stats')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Get notification statistics' })
  async getStats(
    @TenantId() tenantId: string,
    @Body() body: { startDate: Date; endDate: Date },
  ) {
    return this.notificationService.getNotificationStats(tenantId, body.startDate, body.endDate);
  }
}
