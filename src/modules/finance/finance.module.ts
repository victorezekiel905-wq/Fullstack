import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { FinanceController } from './finance.controller';
import { FeeManagementService } from './services/fee-management.service';
import { FinanceProcessor } from './processors/finance.processor';

import { FeeStructure } from './entities/fee-structure.entity';
import { FeeInvoice } from './entities/fee-invoice.entity';
import { FeePayment } from './entities/fee-payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FeeStructure,
      FeeInvoice,
      FeePayment,
    ]),
    BullModule.registerQueue({
      name: 'finance',
    }),
  ],
  controllers: [FinanceController],
  providers: [FeeManagementService, FinanceProcessor],
  exports: [FeeManagementService],
})
export class FinanceModule {}
