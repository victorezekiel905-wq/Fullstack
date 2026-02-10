import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ResultComputationService, ComputeResultDto } from './services/result-computation.service';
import { GradeCalculatorService } from './services/grade-calculator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Results')
@Controller('results')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ResultsController {
  constructor(
    private readonly computationService: ResultComputationService,
    private readonly gradeCalculator: GradeCalculatorService,
  ) {}

  @Post('compute')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Trigger result computation for a class/term' })
  @ApiResponse({ status: 202, description: 'Computation job queued' })
  async computeResults(@Body() dto: ComputeResultDto) {
    return this.computationService.triggerComputation(dto);
  }

  @Get('computation/:jobId')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get computation progress' })
  async getComputationProgress(@Param('jobId') jobId: string) {
    return this.computationService.getComputationProgress(jobId);
  }

  @Post('publish')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Publish results to students/parents' })
  async publishResults(
    @Body() body: { termId: string; classId: string },
  ) {
    await this.computationService.publishResults(body.termId, body.classId);
    return { message: 'Results published successfully' };
  }

  @Post('unpublish')
  @Roles('admin', 'headteacher')
  @ApiOperation({ summary: 'Unpublish results' })
  async unpublishResults(
    @Body() body: { termId: string; classId: string },
  ) {
    await this.computationService.unpublishResults(body.termId, body.classId);
    return { message: 'Results unpublished successfully' };
  }

  @Get('statistics/:termId/:classId')
  @Roles('admin', 'teacher', 'headteacher')
  @ApiOperation({ summary: 'Get term statistics for a class' })
  async getStatistics(
    @Param('termId') termId: string,
    @Param('classId') classId: string,
  ) {
    return this.gradeCalculator.calculateTermStatistics(termId, classId);
  }

  @Get('positions/:termId/:classId')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get class positions' })
  async getPositions(
    @Param('termId') termId: string,
    @Param('classId') classId: string,
  ) {
    const positions = await this.gradeCalculator.calculatePositions(termId, classId);
    return Array.from(positions.entries()).map(([studentId, position]) => ({
      studentId,
      position,
    }));
  }

  @Get('subject-positions/:termId/:classId/:subjectId')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get subject positions' })
  async getSubjectPositions(
    @Param('termId') termId: string,
    @Param('classId') classId: string,
    @Param('subjectId') subjectId: string,
  ) {
    const positions = await this.gradeCalculator.calculateSubjectPositions(
      termId,
      classId,
      subjectId,
    );
    return Array.from(positions.entries()).map(([studentId, position]) => ({
      studentId,
      position,
    }));
  }

  @Get('class-average/:termId/:classId/:subjectId')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get class average for a subject' })
  async getClassAverage(
    @Param('termId') termId: string,
    @Param('classId') classId: string,
    @Param('subjectId') subjectId: string,
  ) {
    const average = await this.gradeCalculator.calculateClassAverage(
      termId,
      classId,
      subjectId,
    );
    return { average };
  }
}
