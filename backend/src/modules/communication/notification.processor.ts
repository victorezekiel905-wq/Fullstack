import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationService } from './services/notification.service';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Process('send-notification')
  async handleSendNotification(job: Job<{ messageLogId: string; tenantId: string }>) {
    this.logger.log(`Processing notification job ${job.id}`);

    try {
      await this.notificationService.processNotification(job.data.messageLogId, job.data.tenantId);
      this.logger.log(`Notification job ${job.id} completed`);
    } catch (error) {
      this.logger.error(`Notification job ${job.id} failed`, error);
      throw error;
    }
  }
}
