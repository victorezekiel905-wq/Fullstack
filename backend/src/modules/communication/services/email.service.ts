import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageLog } from '../entities/message-log.entity';
import { MessageTemplate } from '../entities/message-template.entity';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  body?: string;
  html?: string;
  template?: string;
  context?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
  }>;
  tenantId: string;
  userId?: string;
  cc?: string[];
  bcc?: string[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly enabled: boolean;

  constructor(
    private configService: ConfigService,
    @InjectRepository(MessageLog)
    private messageLogRepository: Repository<MessageLog>,
    @InjectRepository(MessageTemplate)
    private templateRepository: Repository<MessageTemplate>,
  ) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.enabled = !!(host && port && user && pass);

    if (this.enabled) {
      try {
        this.transporter = nodemailer.createTransporter({
          host,
          port,
          secure: port === 465,
          auth: {
            user,
            pass,
          },
          pool: true, // Enable connection pooling
          maxConnections: 5,
          maxMessages: 100,
        });

        // Verify connection
        this.transporter.verify((error) => {
          if (error) {
            this.logger.error('SMTP connection verification failed', error);
            this.enabled = false;
          } else {
            this.logger.log('Email service initialized and verified');
          }
        });
      } catch (error) {
        this.logger.error('Failed to initialize email transporter', error);
        this.enabled = false;
      }
    } else {
      this.logger.warn('Email service disabled - SMTP credentials not configured');
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const startTime = Date.now();

    try {
      if (!this.enabled || !this.transporter) {
        this.logger.warn('Email service not enabled');
        await this.logMessage(options, 'failed', 'Email service not configured');
        return { success: false, error: 'Email service not configured' };
      }

      let htmlContent = options.html || options.body;

      // If template is specified, load and compile it
      if (options.template) {
        htmlContent = await this.renderTemplate(options.template, options.context || {}, options.tenantId);
      }

      const from = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER');
      
      const mailOptions: nodemailer.SendMailOptions = {
        from,
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        subject: options.subject,
        text: options.body,
        html: htmlContent,
        attachments: options.attachments,
        cc: options.cc,
        bcc: options.bcc,
      };

      this.logger.log(`Sending email to ${mailOptions.to} - Subject: ${options.subject}`);

      const info = await this.transporter.sendMail(mailOptions);

      const duration = Date.now() - startTime;
      this.logger.log(`Email sent successfully to ${mailOptions.to} in ${duration}ms - ID: ${info.messageId}`);

      await this.logMessage(options, 'sent', null, info.messageId, duration);

      return { success: true, messageId: info.messageId };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to send email to ${options.to}: ${error.message}`, error.stack);

      await this.logMessage(options, 'failed', error.message, null, duration);

      return { success: false, error: error.message };
    }
  }

  async sendBulkEmail(
    recipients: string[],
    subject: string,
    body: string,
    tenantId: string,
    template?: string,
    context?: Record<string, any>,
  ): Promise<{ total: number; sent: number; failed: number }> {
    this.logger.log(`Starting bulk email send to ${recipients.length} recipients`);

    let sent = 0;
    let failed = 0;

    // Send in batches to avoid overwhelming the SMTP server
    const batchSize = 50;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const promises = batch.map(recipient =>
        this.sendEmail({
          to: recipient,
          subject,
          body,
          template,
          context: { ...context, recipient },
          tenantId,
        }),
      );

      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          sent++;
        } else {
          failed++;
        }
      });

      // Pause between batches
      if (i + batchSize < recipients.length) {
        await this.delay(1000);
      }
    }

    this.logger.log(`Bulk email completed: ${sent} sent, ${failed} failed out of ${recipients.length}`);

    return { total: recipients.length, sent, failed };
  }

  async renderTemplate(templateName: string, context: Record<string, any>, tenantId: string): Promise<string> {
    try {
      // Try to load template from database
      const template = await this.templateRepository.findOne({
        where: { name: templateName, tenantId },
      });

      if (template) {
        const compiled = handlebars.compile(template.content);
        return compiled(context);
      }

      // Fallback to default templates
      const defaultTemplate = this.getDefaultTemplate(templateName);
      const compiled = handlebars.compile(defaultTemplate);
      return compiled(context);
    } catch (error) {
      this.logger.error(`Failed to render template ${templateName}`, error);
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  private getDefaultTemplate(templateName: string): string {
    const templates: Record<string, string> = {
      'welcome': `
        <h1>Welcome to SynergySwift, {{firstName}}!</h1>
        <p>Thank you for joining our school management platform.</p>
        <p>Your account has been created successfully.</p>
        <p><a href="{{loginUrl}}">Click here to login</a></p>
      `,
      'password-reset': `
        <h1>Password Reset Request</h1>
        <p>Hi {{firstName}},</p>
        <p>You requested to reset your password. Click the link below:</p>
        <p><a href="{{resetUrl}}">Reset Password</a></p>
        <p>This link expires in {{expiresIn}} hours.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      'result-published': `
        <h1>Academic Results Published</h1>
        <p>Dear {{parentName}},</p>
        <p>The {{term}} results for {{studentName}} are now available.</p>
        <p><a href="{{resultsUrl}}">View Results</a></p>
      `,
      'fee-reminder': `
        <h1>Fee Payment Reminder</h1>
        <p>Dear {{parentName}},</p>
        <p>This is a reminder that the school fees for {{studentName}} are due.</p>
        <p>Amount Due: {{currency}}{{amount}}</p>
        <p>Due Date: {{dueDate}}</p>
        <p><a href="{{paymentUrl}}">Pay Now</a></p>
      `,
      'attendance-alert': `
        <h1>Attendance Alert</h1>
        <p>Dear {{parentName}},</p>
        <p>{{studentName}} was absent on {{date}}.</p>
        <p>Total absences this term: {{totalAbsences}}</p>
        <p>Please contact the school if there are any concerns.</p>
      `,
    };

    return templates[templateName] || '<p>{{message}}</p>';
  }

  private async logMessage(
    options: EmailOptions,
    status: string,
    error: string | null,
    externalId?: string,
    duration?: number,
  ): Promise<void> {
    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      
      for (const recipient of recipients) {
        const log = this.messageLogRepository.create({
          tenantId: options.tenantId,
          userId: options.userId,
          channel: 'email',
          recipient,
          subject: options.subject,
          body: options.body || options.html?.substring(0, 500),
          status,
          externalId,
          error,
          metadata: {
            template: options.template,
            hasAttachments: !!options.attachments?.length,
            duration,
          },
        });

        await this.messageLogRepository.save(log);
      }
    } catch (error) {
      this.logger.error('Failed to log email message', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testConnection(): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('SMTP connection test failed', error);
      return false;
    }
  }
}
