import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ResultComputationService, ComputeResultDto } from './services/result-computation.service';

@Processor('results')
export class ResultsProcessor {
  private readonly logger = new Logger(ResultsProcessor.name);

  constructor(private readonly computationService: ResultComputationService) {}

  @Process('compute-results')
  async handleComputeResults(job: Job<ComputeResultDto>) {
    this.logger.log(`Processing job ${job.id}: compute-results`);

    try {
      const progress = await this.computationService.computeResults(job.data);
      
      await job.progress(100);
      
      this.logger.log(`Job ${job.id} completed: ${progress.processed}/${progress.total} successful`);
      
      return progress;
    } catch (error) {
      this.logger.error(`Job ${job.id} failed`, error);
      throw error;
    }
  }

  @Process('notify-results-published')
  async handleNotifyResultsPublished(job: Job<any>) {
    this.logger.log(`Processing job ${job.id}: notify-results-published`);
    
    // This will be implemented in the communication module
    // For now, just log
    const { termId, classId, studentIds } = job.data;
    
    this.logger.log(`Results published notification: term=${termId}, class=${classId}, students=${studentIds.length}`);
    
    // TODO: Send WhatsApp/Email notifications via communication service
    
    return { notified: studentIds.length };
  }
}
