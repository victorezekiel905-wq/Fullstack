import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { EnterpriseLoggerService } from '../services/enterprise-logger.service';

@Injectable()
export class EnterpriseCorrelationIdInterceptor implements NestInterceptor {
  constructor(private readonly logger: EnterpriseLoggerService) {
    this.logger.setContext('EnterpriseCorrelationIdInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Generate or extract correlation ID
    const correlationId =
      request.headers['x-correlation-id'] ||
      request.headers['x-request-id'] ||
      uuidv4();

    // Attach to request for downstream use
    request.correlationId = correlationId;
    request.startTime = Date.now();

    // Add to response headers
    response.setHeader('X-Correlation-ID', correlationId);

    // Extract request context
    const requestContext = {
      correlationId,
      method: request.method,
      path: request.url,
      ip: request.ip || request.connection.remoteAddress,
      userAgent: request.headers['user-agent'],
      userId: request.user?.id,
      tenantId: request.tenantId,
    };

    // Log incoming request
    this.logger.logRequest({
      message: `Incoming ${request.method} ${request.url}`,
      ...requestContext,
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - request.startTime;
          const statusCode = response.statusCode;

          // Log response
          this.logger.logResponse({
            message: `Completed ${request.method} ${request.url}`,
            ...requestContext,
            statusCode,
            duration,
          });

          // Log slow requests
          if (duration > 3000) {
            this.logger.warn(`Slow request detected: ${request.method} ${request.url}`, {
              ...requestContext,
              duration,
            });
          }

          // Log performance metrics
          this.logger.logPerformance(
            `${request.method} ${request.url}`,
            duration,
            requestContext
          );
        },
        error: (error) => {
          const duration = Date.now() - request.startTime;
          
          this.logger.error(
            `Request failed: ${request.method} ${request.url}`,
            error.stack,
            {
              ...requestContext,
              duration,
              errorMessage: error.message,
              errorName: error.name,
            }
          );
        },
      })
    );
  }
}
