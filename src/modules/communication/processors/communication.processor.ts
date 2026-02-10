import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MetricsService } from '../../common/metrics/metrics.service';

export interface EmailJob {
  tenantId: string;
  to: string | string[];
  subject: string;
  body: string;
  templateId?: string;
  attachments?: any[];
}

export interface WhatsAppJob {
  tenantId: string;
  to: string | string[];
  message: string;
  templateName?: string;
  mediaUrl?: string;
}

@Processor('communication')
export class CommunicationProcessor {
  private readonly logger = new Logger(CommunicationProcessor.name);

  constructor(private readonly metricsService: MetricsService) {}

  @Process('send-email')
  async handleEmailSending(job: Job<EmailJob>) {
    const startTime = Date.now();
    this.logger.log(`Sending email to ${job.data.to} for tenant ${job.data.tenantId}`);

    try {
      await this.sendEmail(job.data);

      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.recordQueueJob('communication', 'send-email', 'success');

      return {
        status: 'sent',
        messageId: `msg_${Date.now()}`,
        timestamp: new Date(),
        duration,
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      this.metricsService.recordQueueJob('communication', 'send-email', 'failed');
      this.metricsService.recordQueueJobFailure('communication', 'send-email', error.constructor.name);
      throw error;
    }
  }

  @Process('send-whatsapp')
  async handleWhatsAppSending(job: Job<WhatsAppJob>) {
    const startTime = Date.now();
    this.logger.log(`Sending WhatsApp message to ${job.data.to} for tenant ${job.data.tenantId}`);

    try {
      await this.sendWhatsApp(job.data);

      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.recordQueueJob('communication', 'send-whatsapp', 'success');

      return {
        status: 'sent',
        messageId: `wa_${Date.now()}`,
        timestamp: new Date(),
        duration,
      };
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`, error.stack);
      this.metricsService.recordQueueJob('communication', 'send-whatsapp', 'failed');
      this.metricsService.recordQueueJobFailure('communication', 'send-whatsapp', error.constructor.name);
      throw error;
    }
  }

  @Process('send-bulk-messages')
  async handleBulkMessages(job: Job<any>) {
    const startTime = Date.now();
    this.logger.log(`Sending bulk messages for tenant ${job.data.tenantId}`);

    try {
      const { recipients, message, channel } = job.data;
      const results = [];

      for (const recipient of recipients) {
        try {
          if (channel === 'email') {
            await this.sendEmail({
              tenantId: job.data.tenantId,
              to: recipient.email,
              subject: message.subject,
              body: message.body,
            });
          } else if (channel === 'whatsapp') {
            await this.sendWhatsApp({
              tenantId: job.data.tenantId,
              to: recipient.phone,
              message: message.text,
            });
          }

          results.push({ recipient, status: 'sent' });
        } catch (error) {
          results.push({ recipient, status: 'failed', error: error.message });
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.recordQueueJob('communication', 'send-bulk-messages', 'success');

      return {
        status: 'completed',
        total: recipients.length,
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length,
        results,
        duration,
      };
    } catch (error) {
      this.logger.error(`Failed to send bulk messages: ${error.message}`, error.stack);
      this.metricsService.recordQueueJob('communication', 'send-bulk-messages', 'failed');
      this.metricsService.recordQueueJobFailure('communication', 'send-bulk-messages', error.constructor.name);
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onComplete(job: Job, result: any) {
    this.logger.log(`Completed job ${job.id} with result:`, result);
  }

  @OnQueueFailed()
  onError(job: Job, error: any) {
    this.logger.error(`Job ${job.id} failed with error: ${error.message}`, error.stack);
  }

  private async sendEmail(data: EmailJob) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async sendWhatsApp(data: WhatsAppJob) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
