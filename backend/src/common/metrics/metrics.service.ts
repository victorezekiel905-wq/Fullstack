import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Histogram, register, Registry } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: Registry;
  
  public readonly httpRequestDuration: Histogram;
  public readonly httpRequestTotal: Counter;
  public readonly httpRequestErrors: Counter;
  public readonly dbQueryDuration: Histogram;
  public readonly dbConnectionPool: Counter;
  public readonly queueJobProcessed: Counter;
  public readonly queueJobFailed: Counter;
  public readonly tenantOperations: Counter;

  constructor() {
    this.registry = register;

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    });

    this.dbConnectionPool = new Counter({
      name: 'db_connection_pool_total',
      help: 'Database connection pool usage',
      labelNames: ['status'],
    });

    this.queueJobProcessed = new Counter({
      name: 'queue_job_processed_total',
      help: 'Total number of queue jobs processed',
      labelNames: ['queue', 'job_type', 'status'],
    });

    this.queueJobFailed = new Counter({
      name: 'queue_job_failed_total',
      help: 'Total number of queue jobs failed',
      labelNames: ['queue', 'job_type', 'error_type'],
    });

    this.tenantOperations = new Counter({
      name: 'tenant_operations_total',
      help: 'Total number of tenant operations',
      labelNames: ['tenant_id', 'operation'],
    });
  }

  onModuleInit() {
    console.log('Prometheus metrics initialized');
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    this.httpRequestTotal.inc({ method, route, status_code: statusCode });
  }

  recordHttpError(method: string, route: string, errorType: string) {
    this.httpRequestErrors.inc({ method, route, error_type: errorType });
  }

  recordDbQuery(operation: string, table: string, duration: number) {
    this.dbQueryDuration.observe({ operation, table }, duration);
  }

  recordQueueJob(queue: string, jobType: string, status: 'success' | 'failed') {
    this.queueJobProcessed.inc({ queue, job_type: jobType, status });
  }

  recordQueueJobFailure(queue: string, jobType: string, errorType: string) {
    this.queueJobFailed.inc({ queue, job_type: jobType, error_type: errorType });
  }

  recordTenantOperation(tenantId: string, operation: string) {
    this.tenantOperations.inc({ tenant_id: tenantId, operation });
  }
}
