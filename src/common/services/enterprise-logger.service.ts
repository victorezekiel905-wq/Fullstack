import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

@Injectable()
export class EnterpriseLoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context: string = 'Application';

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production' || 
                         process.env.NODE_ENV === 'render-free' ||
                         process.env.NODE_ENV === 'enterprise';

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        isProduction 
          ? winston.format.json() // Structured JSON for production
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
                return `${timestamp} [${context || 'App'}] ${level}: ${message} ${metaStr}`;
              })
            )
      ),
      transports: [
        new winston.transports.Console({
          stderrLevels: ['error'],
        }),
      ],
      exitOnError: false,
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: LogContext | string) {
    const ctx = typeof context === 'string' ? { context } : context;
    this.logger.info(message, {
      context: typeof context === 'string' ? context : this.context,
      ...this.sanitize(ctx),
    });
  }

  error(message: string, trace?: string, context?: LogContext | string) {
    const ctx = typeof context === 'string' ? { context } : context;
    this.logger.error(message, {
      context: typeof context === 'string' ? context : this.context,
      trace,
      ...this.sanitize(ctx),
    });
  }

  warn(message: string, context?: LogContext | string) {
    const ctx = typeof context === 'string' ? { context } : context;
    this.logger.warn(message, {
      context: typeof context === 'string' ? context : this.context,
      ...this.sanitize(ctx),
    });
  }

  debug(message: string, context?: LogContext | string) {
    const ctx = typeof context === 'string' ? { context } : context;
    this.logger.debug(message, {
      context: typeof context === 'string' ? context : this.context,
      ...this.sanitize(ctx),
    });
  }

  verbose(message: string, context?: LogContext | string) {
    this.debug(message, context);
  }

  /**
   * Enterprise logging with full context
   */
  logRequest(context: LogContext & { message?: string }) {
    const { message, ...rest } = context;
    this.logger.info(message || 'HTTP Request', {
      context: this.context,
      type: 'http_request',
      ...this.sanitize(rest),
    });
  }

  logResponse(context: LogContext & { message?: string }) {
    const { message, ...rest } = context;
    const level = this.getLogLevelByStatusCode(rest.statusCode);
    this.logger.log(level, message || 'HTTP Response', {
      context: this.context,
      type: 'http_response',
      ...this.sanitize(rest),
    });
  }

  logAudit(action: string, context: LogContext) {
    this.logger.info(`AUDIT: ${action}`, {
      context: this.context,
      type: 'audit',
      action,
      ...this.sanitize(context),
    });
  }

  logSecurity(event: string, context: LogContext) {
    this.logger.warn(`SECURITY: ${event}`, {
      context: this.context,
      type: 'security',
      event,
      ...this.sanitize(context),
    });
  }

  logPerformance(operation: string, duration: number, context?: LogContext) {
    const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
    this.logger.log(level, `PERFORMANCE: ${operation}`, {
      context: this.context,
      type: 'performance',
      operation,
      duration,
      ...this.sanitize(context),
    });
  }

  logDatabase(query: string, duration: number, context?: LogContext) {
    this.logger.debug('DATABASE: Query executed', {
      context: this.context,
      type: 'database',
      query: this.sanitizeQuery(query),
      duration,
      ...this.sanitize(context),
    });
  }

  /**
   * Remove sensitive data from logs
   */
  private sanitize(context?: LogContext): Record<string, any> {
    if (!context) return {};

    const sanitized = { ...context };
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'authorization',
      'cookie',
      'apiKey',
      'api_key',
      'accessToken',
      'refreshToken',
    ];

    Object.keys(sanitized).forEach((key) => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeQuery(query: string): string {
    // Limit query length for logs
    if (query.length > 500) {
      return query.substring(0, 500) + '... [truncated]';
    }
    return query;
  }

  private getLogLevelByStatusCode(statusCode?: number): string {
    if (!statusCode) return 'info';
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }
}
