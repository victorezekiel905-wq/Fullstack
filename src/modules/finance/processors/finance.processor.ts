import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MetricsService } from '../../common/metrics/metrics.service';

export interface FeeComputationJob {
  tenantId: string;
  sessionId: string;
  termId?: string;
  classId?: string;
  studentId?: string;
}

@Processor('finance')
export class FinanceProcessor {
  private readonly logger = new Logger(FinanceProcessor.name);

  constructor(private readonly metricsService: MetricsService) {}

  @Process('generate-invoices')
  async handleInvoiceGeneration(job: Job<FeeComputationJob>) {
    const startTime = Date.now();
    this.logger.log(`Generating invoices for tenant ${job.data.tenantId}`);

    try {
      await this.generateInvoices(job.data);

      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.recordQueueJob('finance', 'generate-invoices', 'success');

      return {
        status: 'completed',
        tenantId: job.data.tenantId,
        timestamp: new Date(),
        duration,
      };
    } catch (error) {
      this.logger.error(`Failed to generate invoices: ${error.message}`, error.stack);
      this.metricsService.recordQueueJob('finance', 'generate-invoices', 'failed');
      this.metricsService.recordQueueJobFailure('finance', 'generate-invoices', error.constructor.name);
      throw error;
    }
  }

  @Process('mark-overdue')
  async handleMarkOverdue(job: Job<any>) {
    const startTime = Date.now();
    this.logger.log(`Marking overdue invoices for tenant ${job.data.tenantId}`);

    try {
      await this.markOverdueInvoices(job.data.tenantId);

      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.recordQueueJob('finance', 'mark-overdue', 'success');

      return {
        status: 'completed',
        timestamp: new Date(),
        duration,
      };
    } catch (error) {
      this.logger.error(`Failed to mark overdue: ${error.message}`, error.stack);
      this.metricsService.recordQueueJob('finance', 'mark-overdue', 'failed');
      this.metricsService.recordQueueJobFailure('finance', 'mark-overdue', error.constructor.name);
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing finance job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onComplete(job: Job, result: any) {
    this.logger.log(`Completed finance job ${job.id}`, result);
  }

  @OnQueueFailed()
  onError(job: Job, error: any) {
    this.logger.error(`Finance job ${job.id} failed: ${error.message}`, error.stack);
  }

  private async generateInvoices(data: FeeComputationJob) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async markOverdueInvoices(tenantId: string) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
