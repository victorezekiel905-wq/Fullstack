import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

export interface CreateAuditLogDto {
  userId: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  status?: 'SUCCESS' | 'FAILED' | 'ERROR';
  errorMessage?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(tenantId: string, dto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      tenantId,
      ...dto,
      status: dto.status || 'SUCCESS',
    });

    return this.auditLogRepository.save(auditLog);
  }

  async findAll(
    tenantId: string,
    filters?: {
      userId?: string;
      action?: string;
      entityType?: string;
      entityId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const where: any = { tenantId };

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters?.entityId) {
      where.entityId = filters.entityId;
    }

    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit')
      .where(where);

    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('audit.created_at BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    const total = await queryBuilder.getCount();

    if (filters?.limit) {
      queryBuilder.take(filters.limit);
    }

    if (filters?.offset) {
      queryBuilder.skip(filters.offset);
    }

    const logs = await queryBuilder
      .orderBy('audit.created_at', 'DESC')
      .getMany();

    return { logs, total };
  }

  async getEntityHistory(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { tenantId, entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  async getUserActivity(
    tenantId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AuditLog[]> {
    const where: any = { tenantId, userId };

    if (startDate && endDate) {
      return this.auditLogRepository.find({
        where: {
          ...where,
          createdAt: Between(startDate, endDate),
        },
        order: { createdAt: 'DESC' },
        take: 100,
      });
    }

    return this.auditLogRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getStatistics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const logs = await this.auditLogRepository.find({
      where: {
        tenantId,
        createdAt: Between(startDate, endDate),
      },
    });

    const byAction = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    const byEntityType = logs.reduce((acc, log) => {
      acc[log.entityType] = (acc[log.entityType] || 0) + 1;
      return acc;
    }, {});

    const byUser = logs.reduce((acc, log) => {
      acc[log.userId] = (acc[log.userId] || 0) + 1;
      return acc;
    }, {});

    return {
      total: logs.length,
      byAction,
      byEntityType,
      byUser,
      successRate: logs.length > 0 
        ? (logs.filter((l) => l.status === 'SUCCESS').length / logs.length) * 100 
        : 0,
    };
  }
}
