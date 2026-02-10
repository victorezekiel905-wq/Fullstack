import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, LessThan } from 'typeorm';
import { FeeInvoice } from '../entities/fee-invoice.entity';
import { FeePayment } from '../entities/fee-payment.entity';
import { FeeStructure } from '../entities/fee-structure.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface CreateInvoiceDto {
  studentId: string;
  sessionId: string;
  termId?: string;
  feeStructureIds: string[];
  discountAmount?: number;
  dueDate: Date;
  notes?: string;
}

export interface RecordPaymentDto {
  invoiceId: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'MOBILE_MONEY' | 'CHEQUE' | 'POS';
  paymentDate: Date;
  referenceNumber?: string;
  collectedBy: string;
  notes?: string;
}

@Injectable()
export class FeeManagementService {
  private readonly logger = new Logger(FeeManagementService.name);

  constructor(
    @InjectRepository(FeeInvoice)
    private readonly invoiceRepository: Repository<FeeInvoice>,
    @InjectRepository(FeePayment)
    private readonly paymentRepository: Repository<FeePayment>,
    @InjectRepository(FeeStructure)
    private readonly feeStructureRepository: Repository<FeeStructure>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Generate invoice number
   */
  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    const count = await this.invoiceRepository.count({
      where: { tenantId },
    });
    
    const sequence = String(count + 1).padStart(6, '0');
    return `INV-${year}${month}-${sequence}`;
  }

  /**
   * Generate receipt number
   */
  private async generateReceiptNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    const count = await this.paymentRepository.count({
      where: { tenantId },
    });
    
    const sequence = String(count + 1).padStart(6, '0');
    return `RCT-${year}${month}-${sequence}`;
  }

  /**
   * Create fee invoice
   */
  async createInvoice(tenantId: string, dto: CreateInvoiceDto): Promise<FeeInvoice> {
    this.logger.log(`Creating invoice for student ${dto.studentId}`);

    // Get fee structures
    const feeStructures = await this.feeStructureRepository.findByIds(dto.feeStructureIds);

    if (feeStructures.length !== dto.feeStructureIds.length) {
      throw new BadRequestException('Some fee structures not found');
    }

    // Calculate totals
    const totalAmount = feeStructures.reduce((sum, fee) => sum + Number(fee.amount), 0);
    const discountAmount = dto.discountAmount || 0;
    const netAmount = totalAmount - discountAmount;

    // Prepare line items
    const lineItems = feeStructures.map((fee) => ({
      feeStructureId: fee.id,
      description: fee.name,
      amount: Number(fee.amount),
    }));

    // Create invoice
    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    const invoice = this.invoiceRepository.create({
      tenantId,
      invoiceNumber,
      studentId: dto.studentId,
      sessionId: dto.sessionId,
      termId: dto.termId,
      totalAmount,
      discountAmount,
      netAmount,
      balance: netAmount,
      amountPaid: 0,
      status: 'PENDING',
      lineItems,
      dueDate: dto.dueDate,
      issuedDate: new Date(),
      notes: dto.notes,
    });

    return this.invoiceRepository.save(invoice);
  }

  /**
   * Record payment against invoice
   */
  async recordPayment(tenantId: string, dto: RecordPaymentDto): Promise<FeePayment> {
    this.logger.log(`Recording payment for invoice ${dto.invoiceId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get invoice
      const invoice = await this.invoiceRepository.findOne({
        where: { id: dto.invoiceId, tenantId },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.status === 'PAID') {
        throw new BadRequestException('Invoice is already fully paid');
      }

      if (invoice.status === 'CANCELLED') {
        throw new BadRequestException('Cannot pay cancelled invoice');
      }

      // Validate payment amount
      if (dto.amount <= 0) {
        throw new BadRequestException('Payment amount must be positive');
      }

      if (dto.amount > invoice.balance) {
        throw new BadRequestException('Payment amount exceeds invoice balance');
      }

      // Create payment record
      const receiptNumber = await this.generateReceiptNumber(tenantId);

      const payment = this.paymentRepository.create({
        tenantId,
        receiptNumber,
        invoiceId: dto.invoiceId,
        studentId: invoice.studentId,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        paymentDate: dto.paymentDate,
        referenceNumber: dto.referenceNumber,
        collectedBy: dto.collectedBy,
        status: 'COMPLETED',
        notes: dto.notes,
      });

      await queryRunner.manager.save(FeePayment, payment);

      // Update invoice
      invoice.amountPaid += dto.amount;
      invoice.balance -= dto.amount;

      if (invoice.balance <= 0) {
        invoice.status = 'PAID';
        invoice.balance = 0;
      } else {
        invoice.status = 'PARTIALLY_PAID';
      }

      await queryRunner.manager.save(FeeInvoice, invoice);

      await queryRunner.commitTransaction();

      this.logger.log(`Payment recorded: ${receiptNumber}, amount: ${dto.amount}`);
      return payment;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to record payment', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get student invoices
   */
  async getStudentInvoices(
    tenantId: string,
    studentId: string,
    sessionId?: string,
  ): Promise<FeeInvoice[]> {
    const where: any = { tenantId, studentId };
    
    if (sessionId) {
      where.sessionId = sessionId;
    }

    return this.invoiceRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get invoice payments
   */
  async getInvoicePayments(tenantId: string, invoiceId: string): Promise<FeePayment[]> {
    return this.paymentRepository.find({
      where: { tenantId, invoiceId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get student payment history
   */
  async getStudentPaymentHistory(
    tenantId: string,
    studentId: string,
  ): Promise<FeePayment[]> {
    return this.paymentRepository.find({
      where: { tenantId, studentId },
      order: { paymentDate: 'DESC' },
    });
  }

  /**
   * Get financial summary
   */
  async getFinancialSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const invoices = await this.invoiceRepository.find({
      where: {
        tenantId,
        createdAt: Between(startDate, endDate),
      },
    });

    const payments = await this.paymentRepository.find({
      where: {
        tenantId,
        paymentDate: Between(startDate, endDate),
        status: 'COMPLETED',
      },
    });

    const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.netAmount), 0);
    const totalCollected = payments.reduce((sum, pay) => sum + Number(pay.amount), 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + Number(inv.balance), 0);

    const paidInvoices = invoices.filter((inv) => inv.status === 'PAID').length;
    const partiallyPaidInvoices = invoices.filter((inv) => inv.status === 'PARTIALLY_PAID').length;
    const unpaidInvoices = invoices.filter((inv) => inv.status === 'PENDING').length;

    return {
      totalBilled,
      totalCollected,
      totalOutstanding,
      collectionRate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
      totalInvoices: invoices.length,
      paidInvoices,
      partiallyPaidInvoices,
      unpaidInvoices,
      paymentsByMethod: this.groupPaymentsByMethod(payments),
    };
  }

  /**
   * Group payments by method
   */
  private groupPaymentsByMethod(payments: FeePayment[]): any {
    const grouped = {};

    for (const payment of payments) {
      if (!grouped[payment.paymentMethod]) {
        grouped[payment.paymentMethod] = {
          count: 0,
          amount: 0,
        };
      }
      grouped[payment.paymentMethod].count++;
      grouped[payment.paymentMethod].amount += Number(payment.amount);
    }

    return grouped;
  }

  /**
   * Mark overdue invoices (cron job)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async markOverdueInvoices(): Promise<void> {
    this.logger.log('Running cron: Mark overdue invoices');

    const overdueInvoices = await this.invoiceRepository.find({
      where: {
        status: 'PENDING',
        dueDate: LessThan(new Date()),
      },
    });

    for (const invoice of overdueInvoices) {
      invoice.status = 'OVERDUE';
    }

    if (overdueInvoices.length > 0) {
      await this.invoiceRepository.save(overdueInvoices);
      this.logger.log(`Marked ${overdueInvoices.length} invoices as overdue`);
    }
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(tenantId: string, invoiceId: string): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.amountPaid > 0) {
      throw new BadRequestException('Cannot cancel invoice with payments');
    }

    invoice.status = 'CANCELLED';
    await this.invoiceRepository.save(invoice);

    this.logger.log(`Invoice ${invoiceId} cancelled`);
  }
}
