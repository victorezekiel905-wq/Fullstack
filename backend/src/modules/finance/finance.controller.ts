import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeeManagementService, CreateInvoiceDto, RecordPaymentDto } from './services/fee-management.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('Finance')
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FinanceController {
  constructor(private readonly feeService: FeeManagementService) {}

  @Post('invoices')
  @Roles('admin', 'bursar')
  @ApiOperation({ summary: 'Create fee invoice' })
  async createInvoice(@TenantId() tenantId: string, @Body() dto: CreateInvoiceDto) {
    return this.feeService.createInvoice(tenantId, dto);
  }

  @Post('payments')
  @Roles('admin', 'bursar', 'accountant')
  @ApiOperation({ summary: 'Record payment' })
  async recordPayment(@TenantId() tenantId: string, @Body() dto: RecordPaymentDto) {
    return this.feeService.recordPayment(tenantId, dto);
  }

  @Get('students/:studentId/invoices')
  @Roles('admin', 'bursar', 'parent', 'student')
  @ApiOperation({ summary: 'Get student invoices' })
  async getStudentInvoices(
    @TenantId() tenantId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.feeService.getStudentInvoices(tenantId, studentId);
  }

  @Get('students/:studentId/payments')
  @Roles('admin', 'bursar', 'parent', 'student')
  @ApiOperation({ summary: 'Get student payment history' })
  async getPaymentHistory(
    @TenantId() tenantId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.feeService.getStudentPaymentHistory(tenantId, studentId);
  }

  @Get('summary')
  @Roles('admin', 'bursar', 'headteacher')
  @ApiOperation({ summary: 'Get financial summary' })
  async getFinancialSummary(
    @TenantId() tenantId: string,
    @Body() body: { startDate: Date; endDate: Date },
  ) {
    return this.feeService.getFinancialSummary(tenantId, body.startDate, body.endDate);
  }
}
