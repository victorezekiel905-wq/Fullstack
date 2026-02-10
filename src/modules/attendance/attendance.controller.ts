import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService, MarkAttendanceDto, BulkAttendanceDto } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('Attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('mark')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Mark attendance for single student' })
  async markAttendance(@TenantId() tenantId: string, @Body() dto: MarkAttendanceDto) {
    return this.attendanceService.markAttendance(tenantId, dto);
  }

  @Post('mark-bulk')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Mark bulk attendance for class' })
  async markBulkAttendance(@TenantId() tenantId: string, @Body() dto: BulkAttendanceDto) {
    return this.attendanceService.markBulkAttendance(tenantId, dto);
  }

  @Get('student/:studentId')
  @Roles('admin', 'teacher', 'parent', 'student')
  @ApiOperation({ summary: 'Get student attendance history' })
  async getStudentAttendance(
    @TenantId() tenantId: string,
    @Param('studentId') studentId: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    return this.attendanceService.getStudentAttendance(tenantId, studentId, startDate, endDate);
  }

  @Get('class/:classId/:date')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get class attendance for a specific date' })
  async getClassAttendance(
    @TenantId() tenantId: string,
    @Param('classId') classId: string,
    @Param('date') date: Date,
  ) {
    return this.attendanceService.getClassAttendance(tenantId, classId, date);
  }

  @Get('student/:studentId/statistics')
  @Roles('admin', 'teacher', 'parent')
  @ApiOperation({ summary: 'Get student attendance statistics' })
  async getStudentStatistics(
    @TenantId() tenantId: string,
    @Param('studentId') studentId: string,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.attendanceService.getAttendanceStatistics(tenantId, studentId, startDate, endDate);
  }

  @Get('class/:classId/report')
  @Roles('admin', 'teacher', 'headteacher')
  @ApiOperation({ summary: 'Get class attendance report' })
  async getClassReport(
    @TenantId() tenantId: string,
    @Param('classId') classId: string,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.attendanceService.getClassAttendanceReport(tenantId, classId, startDate, endDate);
  }
}
