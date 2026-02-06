import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { ResultComputationService } from './services/result-computation.service';
import { GradeCalculatorService } from './services/grade-calculator.service';
import { ResultsProcessor } from './processors/results.processor';
import { Result } from './entities/result.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Result]),
    BullModule.registerQueue({
      name: 'results',
    }),
  ],
  controllers: [ResultsController],
  providers: [
    ResultsService,
    ResultComputationService,
    GradeCalculatorService,
    ResultsProcessor,
  ],
  exports: [ResultsService, ResultComputationService],
})
export class ResultsModule {}
