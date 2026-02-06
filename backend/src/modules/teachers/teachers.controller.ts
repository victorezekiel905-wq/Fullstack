import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeachersService, CreateTeacherDto, UpdateTeacherDto } from './teachers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('Teachers')
@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Create teacher' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateTeacherDto) {
    return this.teachersService.create(tenantId, dto);
  }

  @Get()
  @Roles('admin', 'headteacher', 'teacher')
  @ApiOperation({ summary: 'List teachers' })
  async findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('classTeacher') classTeacher?: boolean,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.teachersService.findAll(tenantId, {
      status,
      search,
      classTeacher,
      limit,
      offset,
    });
  }

  @Get('statistics')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Get teacher statistics' })
  async getStatistics(@TenantId() tenantId: string) {
    return this.teachersService.getStatistics(tenantId);
  }

  @Get(':id')
  @Roles('admin', 'headteacher', 'teacher')
  @ApiOperation({ summary: 'Get teacher by ID' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.teachersService.findOne(tenantId, id);
  }

  @Put(':id')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Update teacher' })
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.teachersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Delete teacher' })
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.teachersService.remove(tenantId, id);
    return { message: 'Teacher deleted successfully' };
  }

  @Post(':id/assign-subjects')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Assign subjects to teacher' })
  async assignSubjects(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { subjectIds: string[] },
  ) {
    return this.teachersService.assignSubjects(tenantId, id, body.subjectIds);
  }

  @Post(':id/assign-classes')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Assign classes to teacher' })
  async assignClasses(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { classIds: string[] },
  ) {
    return this.teachersService.assignClasses(tenantId, id, body.classIds);
  }

  @Post(':id/assign-class-teacher')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Assign as class teacher' })
  async assignAsClassTeacher(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { classId: string },
  ) {
    return this.teachersService.assignAsClassTeacher(tenantId, id, body.classId);
  }

  @Get('subject/:subjectId')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Get teachers by subject' })
  async getTeachersBySubject(
    @TenantId() tenantId: string,
    @Param('subjectId') subjectId: string,
  ) {
    return this.teachersService.getTeachersBySubject(tenantId, subjectId);
  }

  @Get('class/:classId')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Get teachers by class' })
  async getTeachersByClass(
    @TenantId() tenantId: string,
    @Param('classId') classId: string,
  ) {
    return this.teachersService.getTeachersByClass(tenantId, classId);
  }

  @Get('class/:classId/class-teacher')
  @Roles('admin', 'headteacher', 'teacher')
  @ApiOperation({ summary: 'Get class teacher' })
  async getClassTeacher(
    @TenantId() tenantId: string,
    @Param('classId') classId: string,
  ) {
    return this.teachersService.getClassTeacher(tenantId, classId);
  }
}
