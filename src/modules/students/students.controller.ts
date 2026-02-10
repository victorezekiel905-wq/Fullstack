import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new student' })
  async create(@Body() createStudentDto: CreateStudentDto, @Req() req: any) {
    const tenantId = req.tenantId;
    return await this.studentsService.create(createStudentDto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all students' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'class_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(@Query() query: any, @Req() req: any) {
    const tenantId = req.tenantId;
    return await this.studentsService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student by ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenantId;
    return await this.studentsService.findOne(id, tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update student' })
  async update(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenantId;
    return await this.studentsService.update(id, updateStudentDto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete student' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenantId;
    await this.studentsService.remove(id, tenantId);
    return { message: 'Student deleted successfully' };
  }

  @Post('bulk-import')
  @ApiOperation({ summary: 'Bulk import students from Excel/CSV' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async bulkImport(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const tenantId = req.tenantId;
    return await this.studentsService.bulkImport(file, tenantId);
  }

  @Get('template/download')
  @ApiOperation({ summary: 'Download CSV template for bulk import' })
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.studentsService.generateCSVTemplate();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=student_import_template.xlsx');
    res.send(buffer);
  }
}
