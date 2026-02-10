import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance } from '../entities/attendance.entity';

export interface MarkAttendanceDto {
  studentId: string;
  classId: string;
  date: Date;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks?: string;
  markedBy: string;
}

export interface BulkAttendanceDto {
  classId: string;
  date: Date;
  attendanceRecords: Array<{
    studentId: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    remarks?: string;
  }>;
  markedBy: string;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
  ) {}

  async markAttendance(tenantId: string, dto: MarkAttendanceDto): Promise<Attendance> {
    // Check if attendance already exists
    const existing = await this.attendanceRepository.findOne({
      where: {
        tenantId,
        studentId: dto.studentId,
        date: dto.date,
      },
    });

    if (existing) {
      // Update existing
      Object.assign(existing, {
        status: dto.status,
        remarks: dto.remarks,
        markedBy: dto.markedBy,
        markedAt: new Date(),
      });
      return this.attendanceRepository.save(existing);
    }

    // Create new
    const attendance = this.attendanceRepository.create({
      tenantId,
      ...dto,
    });

    return this.attendanceRepository.save(attendance);
  }

  async markBulkAttendance(tenantId: string, dto: BulkAttendanceDto): Promise<Attendance[]> {
    const attendanceRecords: Attendance[] = [];

    for (const record of dto.attendanceRecords) {
      const attendance = await this.markAttendance(tenantId, {
        studentId: record.studentId,
        classId: dto.classId,
        date: dto.date,
        status: record.status,
        remarks: record.remarks,
        markedBy: dto.markedBy,
      });

      attendanceRecords.push(attendance);
    }

    return attendanceRecords;
  }

  async getStudentAttendance(
    tenantId: string,
    studentId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Attendance[]> {
    const where: any = { tenantId, studentId };

    if (startDate && endDate) {
      where.date = Between(startDate, endDate);
    }

    return this.attendanceRepository.find({
      where,
      order: { date: 'DESC' },
    });
  }

  async getClassAttendance(
    tenantId: string,
    classId: string,
    date: Date,
  ): Promise<Attendance[]> {
    return this.attendanceRepository.find({
      where: { tenantId, classId, date },
      order: { createdAt: 'ASC' },
    });
  }

  async getAttendanceStatistics(
    tenantId: string,
    studentId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const records = await this.getStudentAttendance(tenantId, studentId, startDate, endDate);

    const stats = {
      totalDays: records.length,
      present: records.filter((r) => r.status === 'PRESENT').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      late: records.filter((r) => r.status === 'LATE').length,
      excused: records.filter((r) => r.status === 'EXCUSED').length,
    };

    return {
      ...stats,
      attendanceRate: stats.totalDays > 0 ? (stats.present / stats.totalDays) * 100 : 0,
    };
  }

  async getClassAttendanceReport(
    tenantId: string,
    classId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const records = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.tenant_id = :tenantId', { tenantId })
      .andWhere('attendance.class_id = :classId', { classId })
      .andWhere('attendance.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    // Group by student
    const studentAttendance = records.reduce((acc, record) => {
      if (!acc[record.studentId]) {
        acc[record.studentId] = {
          studentId: record.studentId,
          totalDays: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
        };
      }

      acc[record.studentId].totalDays++;
      
      if (record.status === 'PRESENT') acc[record.studentId].present++;
      if (record.status === 'ABSENT') acc[record.studentId].absent++;
      if (record.status === 'LATE') acc[record.studentId].late++;
      if (record.status === 'EXCUSED') acc[record.studentId].excused++;

      return acc;
    }, {});

    // Calculate attendance rates
    return Object.values(studentAttendance).map((stats: any) => ({
      ...stats,
      attendanceRate: stats.totalDays > 0 ? (stats.present / stats.totalDays) * 100 : 0,
    }));
  }
}
