import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageLog } from '../entities/message-log.entity';
import * as twilio from 'twilio';

export interface SMSOptions {
  to: string;
  message: string;
  tenantId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class SMSService {
  private readonly logger = new Logger(SMSService.name);
  private twilioClient: twilio.Twilio | null = null;
  private readonly enabled: boolean;

  constructor(
    private configService: ConfigService,
    @InjectRepository(MessageLog)
    private messageLogRepository: Repository<MessageLog>,
  ) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    
    this.enabled = !!(accountSid && authToken);
    
    if (this.enabled) {
      try {
        this.twilioClient = twilio(accountSid, authToken);
        this.logger.log('SMS service initialized with Twilio');
      } catch (error) {
        this.logger.error('Failed to initialize Twilio client', error);
        this.enabled = false;
      }
    } else {
      this.logger.warn('SMS service disabled - Twilio credentials not configured');
    }
  }

  async sendSMS(options: SMSOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const startTime = Date.now();
    
    try {
      if (!this.enabled || !this.twilioClient) {
        this.logger.warn('SMS service not enabled');
        await this.logMessage(options, 'failed', 'SMS service not configured');
        return { success: false, error: 'SMS service not configured' };
      }

      // Validate phone number format
      if (!this.isValidPhoneNumber(options.to)) {
        throw new Error('Invalid phone number format. Use E.164 format (+1234567890)');
      }

      const from = this.configService.get<string>('TWILIO_PHONE_NUMBER');
      
      this.logger.log(`Sending SMS to ${options.to}`);
      
      const message = await this.twilioClient.messages.create({
        body: options.message,
        from,
        to: options.to,
      });

      const duration = Date.now() - startTime;
      this.logger.log(`SMS sent successfully to ${options.to} in ${duration}ms - SID: ${message.sid}`);

      await this.logMessage(options, 'sent', null, message.sid, duration);

      return { success: true, messageId: message.sid };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to send SMS to ${options.to}: ${error.message}`, error.stack);
      
      await this.logMessage(options, 'failed', error.message, null, duration);
      
      return { success: false, error: error.message };
    }
  }

  async sendBulkSMS(
    recipients: string[],
    message: string,
    tenantId: string,
    userId?: string,
  ): Promise<{ total: number; sent: number; failed: number; results: any[] }> {
    this.logger.log(`Starting bulk SMS send to ${recipients.length} recipients`);
    
    const results = [];
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const result = await this.sendSMS({
        to: recipient,
        message,
        tenantId,
        userId,
      });

      results.push({ recipient, ...result });
      
      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Rate limiting: wait 100ms between messages to avoid Twilio limits
      await this.delay(100);
    }

    this.logger.log(`Bulk SMS completed: ${sent} sent, ${failed} failed out of ${recipients.length}`);

    return {
      total: recipients.length,
      sent,
      failed,
      results,
    };
  }

  private isValidPhoneNumber(phone: string): boolean {
    // E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }

  private async logMessage(
    options: SMSOptions,
    status: string,
    error: string | null,
    externalId?: string,
    duration?: number,
  ): Promise<void> {
    try {
      const log = this.messageLogRepository.create({
        tenantId: options.tenantId,
        userId: options.userId,
        channel: 'sms',
        recipient: options.to,
        subject: null,
        body: options.message,
        status,
        externalId,
        error,
        metadata: {
          ...options.metadata,
          duration,
        },
      });

      await this.messageLogRepository.save(log);
    } catch (error) {
      this.logger.error('Failed to log SMS message', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getMessageStatus(messageId: string): Promise<any> {
    if (!this.enabled || !this.twilioClient) {
      throw new Error('SMS service not configured');
    }

    try {
      const message = await this.twilioClient.messages(messageId).fetch();
      return {
        status: message.status,
        to: message.to,
        from: message.from,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch message status for ${messageId}`, error);
      throw error;
    }
  }
}
