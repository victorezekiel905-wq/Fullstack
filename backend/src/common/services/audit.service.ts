import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

export interface AuditLogOptions {
  tenantId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: any;
  after?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  status?: string;
  error?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  correlationId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly enabled: boolean;

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {
    this.enabled = process.env.AUDIT_LOG_ENABLED !== 'false';
    
    if (this.enabled) {
      this.logger.log('Audit logging enabled');
    } else {
      this.logger.warn('Audit logging disabled');
    }
  }

  async log(options: AuditLogOptions): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const auditLog = this.auditLogRepository.create({
        tenantId: options.tenantId,
        userId: options.userId,
        action: options.action,
        entity: options.entity,
        entityId: options.entityId,
        before: options.before,
        after: options.after,
        metadata: options.metadata,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        status: options.status || 'success',
        error: options.error,
        severity: options.severity || 'low',
        correlationId: options.correlationId,
      });

      await this.auditLogRepository.save(auditLog);

      // Log critical events immediately
      if (options.severity === 'critical') {
        this.logger.warn(`CRITICAL AUDIT EVENT: ${options.action} on ${options.entity} by user ${options.userId}`);
      }
    } catch (error) {
      this.logger.error('Failed to write audit log', error);
      // Don't throw - audit logging should not break the application
    }
  }

  async logCreate(
    entity: string,
    entityId: string,
    data: any,
    tenantId: string,
    userId?: string,
    metadata?: any,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'CREATE',
      entity,
      entityId,
      after: data,
      metadata,
      severity: 'low',
    });
  }

  async logUpdate(
    entity: string,
    entityId: string,
    before: any,
    after: any,
    tenantId: string,
    userId?: string,
    metadata?: any,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'UPDATE',
      entity,
      entityId,
      before,
      after,
      metadata,
      severity: 'low',
    });
  }

  async logDelete(
    entity: string,
    entityId: string,
    data: any,
    tenantId: string,
    userId?: string,
    metadata?: any,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'DELETE',
      entity,
      entityId,
      before: data,
      metadata,
      severity: 'medium',
    });
  }

  async logAccess(
    entity: string,
    entityId: string,
    tenantId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'ACCESS',
      entity,
      entityId,
      ipAddress,
      userAgent,
      severity: 'low',
    });
  }

  async logLogin(
    userId: string,
    tenantId: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    error?: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'LOGIN',
      entity: 'User',
      entityId: userId,
      status: success ? 'success' : 'failure',
      error,
      ipAddress,
      userAgent,
      severity: success ? 'low' : 'medium',
    });
  }

  async logLogout(userId: string, tenantId: string): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'LOGOUT',
      entity: 'User',
      entityId: userId,
      severity: 'low',
    });
  }

  async logSecurityEvent(
    event: string,
    tenantId: string,
    userId?: string,
    details?: any,
    ipAddress?: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'SECURITY_EVENT',
      entity: 'System',
      metadata: { event, ...details },
      ipAddress,
      severity: 'high',
    });
  }

  async logDataExport(
    entity: string,
    recordCount: number,
    tenantId: string,
    userId: string,
    format: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'EXPORT',
      entity,
      metadata: { recordCount, format },
      severity: 'medium',
    });
  }

  async logPayment(
    amount: number,
    currency: string,
    status: string,
    tenantId: string,
    userId: string,
    metadata?: any,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'PAYMENT',
      entity: 'Payment',
      status,
      metadata: { amount, currency, ...metadata },
      severity: 'high',
    });
  }

  async getAuditTrail(
    tenantId: string,
    filters?: {
      userId?: string;
      entity?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<AuditLog[]> {
    const query = this.auditLogRepository.createQueryBuilder('audit')
      .where('audit.tenantId = :tenantId', { tenantId });

    if (filters?.userId) {
      query.andWhere('audit.userId = :userId', { userId: filters.userId });
    }

    if (filters?.entity) {
      query.andWhere('audit.entity = :entity', { entity: filters.entity });
    }

    if (filters?.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters?.startDate) {
      query.andWhere('audit.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('audit.createdAt <= :endDate', { endDate: filters.endDate });
    }

    query.orderBy('audit.createdAt', 'DESC');
    query.limit(filters?.limit || 100);

    return query.getMany();
  }

  async getEntityHistory(
    tenantId: string,
    entity: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: {
        tenantId,
        entity,
        entityId,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async getUserActivity(
    tenantId: string,
    userId: string,
    days: number = 30,
  ): Promise<AuditLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.auditLogRepository.find({
      where: {
        tenantId,
        userId,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 1000,
    });
  }

  async getSecurityEvents(
    tenantId: string,
    days: number = 7,
  ): Promise<AuditLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.auditLogRepository.createQueryBuilder('audit')
      .where('audit.tenantId = :tenantId', { tenantId })
      .andWhere('audit.severity IN (:...severities)', { severities: ['high', 'critical'] })
      .andWhere('audit.createdAt >= :startDate', { startDate })
      .orderBy('audit.createdAt', 'DESC')
      .getMany();
  }

  async generateComplianceReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const logs = await this.auditLogRepository.createQueryBuilder('audit')
      .where('audit.tenantId = :tenantId', { tenantId })
      .andWhere('audit.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    const stats = {
      totalEvents: logs.length,
      byAction: {},
      byEntity: {},
      bySeverity: {},
      byUser: {},
      securityEvents: 0,
      failedAttempts: 0,
    };

    logs.forEach(log => {
      // Count by action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

      // Count by entity
      stats.byEntity[log.entity] = (stats.byEntity[log.entity] || 0) + 1;

      // Count by severity
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;

      // Count by user
      if (log.userId) {
        stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
      }

      // Security events
      if (log.severity === 'high' || log.severity === 'critical') {
        stats.securityEvents++;
      }

      // Failed attempts
      if (log.status === 'failure') {
        stats.failedAttempts++;
      }
    });

    return {
      period: { startDate, endDate },
      statistics: stats,
      logs: logs.slice(0, 100), // Include sample of logs
    };
  }
}
