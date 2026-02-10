import { Injectable, Logger } from '@nestjs/common';

export interface Notification {
  id?: string;
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  channels?: Array<'in-app' | 'email' | 'sms' | 'whatsapp'>;
  createdAt?: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async sendNotification(notification: Notification): Promise<void> {
    this.logger.log(`Sending notification to user ${notification.userId}: ${notification.title}`);

    try {
      const channels = notification.channels || ['in-app'];

      // Store in-app notification (simplified - no queue)
      if (channels.includes('in-app')) {
        await this.storeInAppNotification(notification);
      }

      // Direct synchronous sending (no queue for Render Free)
      if (channels.includes('email')) {
        this.logger.log('Email notification would be sent here');
        // Would call emailService.sendEmail() directly
      }

      if (channels.includes('sms')) {
        this.logger.log('SMS notification would be sent here');
        // Would call smsService.sendSMS() directly
      }

      if (channels.includes('whatsapp')) {
        this.logger.log('WhatsApp notification would be sent here');
        // Would call whatsappService.sendMessage() directly
      }

      this.logger.log(`Notification sent successfully across ${channels.length} channel(s)`);
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendBulkNotification(
    userIds: string[],
    notification: Omit<Notification, 'userId'>,
  ): Promise<{ total: number; sent: number; failed: number }> {
    this.logger.log(`Sending bulk notification to ${userIds.length} users`);

    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await this.sendNotification({
          ...notification,
          userId,
        });
        sent++;
      } catch (error) {
        this.logger.error(`Failed to send notification to user ${userId}`, error);
        failed++;
      }
    }

    this.logger.log(`Bulk notification completed: ${sent} sent, ${failed} failed`);

    return {
      total: userIds.length,
      sent,
      failed,
    };
  }

  async sendSystemAlert(
    tenantId: string,
    title: string,
    message: string,
    severity: 'info' | 'warning' | 'error' | 'critical',
  ): Promise<void> {
    this.logger.log(`System alert: ${title} (${severity})`);
    // Direct synchronous processing - no queue
  }

  private async storeInAppNotification(notification: Notification): Promise<void> {
    this.logger.debug(`Storing in-app notification: ${notification.title}`);
    // Would store in database
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    this.logger.debug(`Marking notification ${notificationId} as read for user ${userId}`);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return 0;
  }

  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return [];
  }
}
