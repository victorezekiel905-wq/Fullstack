import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MetricsService } from '../../common/metrics/metrics.service';

export interface ResultComputationJob {
  tenantId: string;
  sessionId: string;
  termId: string;
  classId: string;
}

@Processor('results')
export class ResultsProcessor {
  private readonly logger = new Logger(ResultsProcessor.name);

  constructor(private readonly metricsService: MetricsService) {}

  @Process('compute-results')
  async handleResultComputation(job: Job<ResultComputationJob>) {
    const startTime = Date.now();
    this.logger.log(`Processing result computation for tenant ${job.data.tenantId}`);

    try {
      await this.computeResults(job.data);

      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.recordQueueJob('results', 'compute-results', 'success');

      return {
        status: 'completed',
        tenantId: job.data.tenantId,
        timestamp: new Date(),
        duration,
      };
    } catch (error) {
      this.logger.error(`Failed to compute results: ${error.message}`, error.stack);
      this.metricsService.recordQueueJob('results', 'compute-results', 'failed');
      this.metricsService.recordQueueJobFailure('results', 'compute-results', error.constructor.name);
      throw error;
    }
  }

  @Process('generate-broadsheet')
  async handleBroadsheetGeneration(job: Job<any>) {
    const startTime = Date.now();
    this.logger.log(`Generating broadsheet for class ${job.data.classId}`);
    
    try {
      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.recordQueueJob('results', 'generate-broadsheet', 'success');

      return {
        status: 'completed',
        broadsheetUrl: `https://storage.example.com/broadsheets/${job.data.classId}.pdf`,
        duration,
      };
    } catch (error) {
      this.logger.error(`Failed to generate broadsheet: ${error.message}`, error.stack);
      this.metricsService.recordQueueJob('results', 'generate-broadsheet', 'failed');
      this.metricsService.recordQueueJobFailure('results', 'generate-broadsheet', error.constructor.name);
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

  private async computeResults(data: ResultComputationJob) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
