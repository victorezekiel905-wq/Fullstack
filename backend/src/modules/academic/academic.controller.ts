import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AcademicService } from './academic.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant.decorator';

@ApiTags('Academic')
@Controller('academic')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // Classes
  @Post('classes')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Create class' })
  async createClass(@TenantId() tenantId: string, @Body() dto: any) {
    return this.academicService.createClass(tenantId, dto);
  }

  @Get('classes')
  @Roles('admin', 'headteacher', 'teacher')
  @ApiOperation({ summary: 'List classes' })
  async findAllClasses(
    @TenantId() tenantId: string,
    @Query() filters: any,
  ) {
    return this.academicService.findAllClasses(tenantId, filters);
  }

  @Get('classes/:id')
  @Roles('admin', 'headteacher', 'teacher')
  @ApiOperation({ summary: 'Get class by ID' })
  async findClassById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.academicService.findClassById(tenantId, id);
  }

  // Subjects
  @Post('subjects')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Create subject' })
  async createSubject(@TenantId() tenantId: string, @Body() dto: any) {
    return this.academicService.createSubject(tenantId, dto);
  }

  @Get('subjects')
  @ApiOperation({ summary: 'List subjects' })
  async findAllSubjects(
    @TenantId() tenantId: string,
    @Query() filters: any,
  ) {
    return this.academicService.findAllSubjects(tenantId, filters);
  }

  // Sessions
  @Post('sessions')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Create academic session' })
  async createSession(@TenantId() tenantId: string, @Body() dto: any) {
    return this.academicService.createSession(tenantId, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List sessions' })
  async findAllSessions(@TenantId() tenantId: string) {
    return this.academicService.findAllSessions(tenantId);
  }

  @Get('sessions/current')
  @ApiOperation({ summary: 'Get current session' })
  async getCurrentSession(@TenantId() tenantId: string) {
    return this.academicService.getCurrentSession(tenantId);
  }

  @Put('sessions/:id/set-current')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Set current session' })
  async setCurrentSession(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.academicService.setCurrentSession(tenantId, id);
  }

  // Terms
  @Post('terms')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Create term' })
  async createTerm(@TenantId() tenantId: string, @Body() dto: any) {
    return this.academicService.createTerm(tenantId, dto);
  }

  @Get('terms')
  @ApiOperation({ summary: 'List terms' })
  async findAllTerms(
    @TenantId() tenantId: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.academicService.findAllTerms(tenantId, sessionId);
  }

  @Get('terms/current')
  @ApiOperation({ summary: 'Get current term' })
  async getCurrentTerm(@TenantId() tenantId: string) {
    return this.academicService.getCurrentTerm(tenantId);
  }

  @Put('terms/:id/set-current')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Set current term' })
  async setCurrentTerm(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.academicService.setCurrentTerm(tenantId, id);
  }

  @Get('statistics')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Get academic statistics' })
  async getStatistics(@TenantId() tenantId: string) {
    return this.academicService.getAcademicStatistics(tenantId);
  }
}
