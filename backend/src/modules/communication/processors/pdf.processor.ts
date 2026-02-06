import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MetricsService } from '../../common/metrics/metrics.service';

export interface PDFGenerationJob {
  tenantId: string;
  type: 'report_card' | 'receipt' | 'invoice' | 'broadsheet';
  data: any;
  templateId?: string;
}

@Processor('pdf-generation')
export class PDFProcessor {
  private readonly logger = new Logger(PDFProcessor.name);

  constructor(private readonly metricsService: MetricsService) {}

  @Process('generate-pdf')
  async handlePDFGeneration(job: Job<PDFGenerationJob>) {
    const startTime = Date.now();
    this.logger.log(`Generating ${job.data.type} PDF for tenant ${job.data.tenantId}`);

    try {
      const pdfUrl = await this.generatePDF(job.data);

      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.recordQueueJob('pdf-generation', 'generate-pdf', 'success');

      return {
        status: 'completed',
        pdfUrl,
        timestamp: new Date(),
        duration,
      };
    } catch (error) {
      this.logger.error(`Failed to generate PDF: ${error.message}`, error.stack);
      this.metricsService.recordQueueJob('pdf-generation', 'generate-pdf', 'failed');
      this.metricsService.recordQueueJobFailure('pdf-generation', 'generate-pdf', error.constructor.name);
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing PDF job ${job.id}`);
  }

  @OnQueueCompleted()
  onComplete(job: Job, result: any) {
    this.logger.log(`Completed PDF job ${job.id}`, result);
  }

  @OnQueueFailed()
  onError(job: Job, error: any) {
    this.logger.error(`PDF job ${job.id} failed: ${error.message}`, error.stack);
  }

  private async generatePDF(data: PDFGenerationJob): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return `https://storage.example.com/pdfs/${data.type}_${Date.now()}.pdf`;
  }
}
