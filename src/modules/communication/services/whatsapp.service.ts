import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageLog } from '../entities/message-log.entity';
import axios from 'axios';

export interface WhatsAppOptions {
  to: string;
  message: string;
  tenantId: string;
  userId?: string;
  mediaUrl?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly enabled: boolean;
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly fromNumber: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(MessageLog)
    private messageLogRepository: Repository<MessageLog>,
  ) {
    // Support multiple WhatsApp providers (Twilio, WhatsApp Business API, etc.)
    const provider = this.configService.get<string>('WHATSAPP_PROVIDER', 'twilio');
    
    if (provider === 'twilio') {
      const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
      const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
      this.fromNumber = this.configService.get<string>('TWILIO_WHATSAPP_NUMBER', '');
      
      this.enabled = !!(accountSid && authToken && this.fromNumber);
      
      if (this.enabled) {
        this.apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        this.apiKey = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        this.logger.log('WhatsApp service initialized with Twilio');
      }
    } else if (provider === 'whatsapp-business') {
      const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
      const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
      
      this.enabled = !!(phoneNumberId && accessToken);
      
      if (this.enabled) {
        this.apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
        this.apiKey = accessToken;
        this.fromNumber = phoneNumberId;
        this.logger.log('WhatsApp service initialized with WhatsApp Business API');
      }
    } else {
      this.enabled = false;
      this.logger.warn('WhatsApp service disabled - unknown provider or credentials not configured');
    }

    if (!this.enabled) {
      this.logger.warn('WhatsApp service disabled - credentials not configured');
    }
  }

  async sendMessage(options: WhatsAppOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const startTime = Date.now();

    try {
      if (!this.enabled) {
        this.logger.warn('WhatsApp service not enabled');
        await this.logMessage(options, 'failed', 'WhatsApp service not configured');
        return { success: false, error: 'WhatsApp service not configured' };
      }

      // Format phone number for WhatsApp (whatsapp:+1234567890)
      const toNumber = this.formatWhatsAppNumber(options.to);

      this.logger.log(`Sending WhatsApp message to ${toNumber}`);

      const provider = this.configService.get<string>('WHATSAPP_PROVIDER', 'twilio');
      let result;

      if (provider === 'twilio') {
        result = await this.sendViaTwilio(toNumber, options.message, options.mediaUrl);
      } else if (provider === 'whatsapp-business') {
        result = await this.sendViaWhatsAppBusiness(toNumber, options.message, options.mediaUrl);
      }

      const duration = Date.now() - startTime;
      this.logger.log(`WhatsApp message sent successfully to ${toNumber} in ${duration}ms`);

      await this.logMessage(options, 'sent', null, result.messageId, duration);

      return { success: true, messageId: result.messageId };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to send WhatsApp message to ${options.to}: ${error.message}`, error.stack);

      await this.logMessage(options, 'failed', error.message, null, duration);

      return { success: false, error: error.message };
    }
  }

  private async sendViaTwilio(to: string, message: string, mediaUrl?: string): Promise<{ messageId: string }> {
    const data = new URLSearchParams({
      From: `whatsapp:${this.fromNumber}`,
      To: to,
      Body: message,
    });

    if (mediaUrl) {
      data.append('MediaUrl', mediaUrl);
    }

    const response = await axios.post(this.apiUrl, data.toString(), {
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return { messageId: response.data.sid };
  }

  private async sendViaWhatsAppBusiness(to: string, message: string, mediaUrl?: string): Promise<{ messageId: string }> {
    // Remove 'whatsapp:' prefix for Business API
    const phoneNumber = to.replace('whatsapp:', '');

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
    };

    if (mediaUrl) {
      // Determine media type from URL
      const mediaType = this.getMediaType(mediaUrl);
      payload.type = mediaType;
      payload[mediaType] = {
        link: mediaUrl,
        caption: message,
      };
    } else {
      payload.type = 'text';
      payload.text = {
        preview_url: false,
        body: message,
      };
    }

    const response = await axios.post(this.apiUrl, payload, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return { messageId: response.data.messages[0].id };
  }

  async sendBulkWhatsApp(
    recipients: string[],
    message: string,
    tenantId: string,
    userId?: string,
    mediaUrl?: string,
  ): Promise<{ total: number; sent: number; failed: number; results: any[] }> {
    this.logger.log(`Starting bulk WhatsApp send to ${recipients.length} recipients`);

    const results = [];
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const result = await this.sendMessage({
        to: recipient,
        message,
        tenantId,
        userId,
        mediaUrl,
      });

      results.push({ recipient, ...result });

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Rate limiting: WhatsApp has strict rate limits
      await this.delay(1000); // 1 second between messages
    }

    this.logger.log(`Bulk WhatsApp completed: ${sent} sent, ${failed} failed out of ${recipients.length}`);

    return {
      total: recipients.length,
      sent,
      failed,
      results,
    };
  }

  async sendTemplate(
    to: string,
    templateName: string,
    components: any[],
    tenantId: string,
    userId?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const startTime = Date.now();

    try {
      if (!this.enabled) {
        return { success: false, error: 'WhatsApp service not configured' };
      }

      const provider = this.configService.get<string>('WHATSAPP_PROVIDER', 'twilio');

      if (provider !== 'whatsapp-business') {
        return { success: false, error: 'Template messages only supported with WhatsApp Business API' };
      }

      const toNumber = this.formatWhatsAppNumber(to).replace('whatsapp:', '');

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toNumber,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en',
          },
          components,
        },
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const duration = Date.now() - startTime;
      const messageId = response.data.messages[0].id;

      this.logger.log(`WhatsApp template sent successfully to ${to} in ${duration}ms`);

      await this.messageLogRepository.save({
        tenantId,
        userId,
        channel: 'whatsapp',
        recipient: to,
        subject: `Template: ${templateName}`,
        body: JSON.stringify(components),
        status: 'sent',
        externalId: messageId,
        metadata: { template: templateName, duration },
      });

      return { success: true, messageId };
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp template to ${to}`, error);
      return { success: false, error: error.message };
    }
  }

  private formatWhatsAppNumber(phone: string): string {
    // Ensure number has whatsapp: prefix and + for country code
    if (phone.startsWith('whatsapp:')) {
      return phone;
    }
    
    const cleanPhone = phone.startsWith('+') ? phone : `+${phone}`;
    return `whatsapp:${cleanPhone}`;
  }

  private getMediaType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'webp'].includes(extension || '')) {
      return 'image';
    } else if (['mp4', '3gp'].includes(extension || '')) {
      return 'video';
    } else if (['mp3', 'ogg', 'amr'].includes(extension || '')) {
      return 'audio';
    } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension || '')) {
      return 'document';
    }
    
    return 'document'; // default
  }

  private async logMessage(
    options: WhatsAppOptions,
    status: string,
    error: string | null,
    externalId?: string,
    duration?: number,
  ): Promise<void> {
    try {
      const log = this.messageLogRepository.create({
        tenantId: options.tenantId,
        userId: options.userId,
        channel: 'whatsapp',
        recipient: options.to,
        subject: null,
        body: options.message,
        status,
        externalId,
        error,
        metadata: {
          ...options.metadata,
          mediaUrl: options.mediaUrl,
          duration,
        },
      });

      await this.messageLogRepository.save(log);
    } catch (error) {
      this.logger.error('Failed to log WhatsApp message', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getMessageStatus(messageId: string): Promise<any> {
    // Implementation depends on provider
    // This would query the provider's API for message delivery status
    this.logger.warn('getMessageStatus not implemented yet');
    return { status: 'unknown' };
  }
}
