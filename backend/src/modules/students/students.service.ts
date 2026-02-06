import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Student } from './entities/student.entity';
import { CreateStudentDto, UpdateStudentDto, BulkImportStudentDto } from './dto/student.dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    private dataSource: DataSource,
  ) {}

  async create(createStudentDto: CreateStudentDto, tenantId: string): Promise<Student> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate admission number if not provided
      const admission_number = createStudentDto.admission_number || 
        await this.generateAdmissionNumber(tenantId);

      // Check if admission number already exists
      const existing = await this.studentRepository.findOne({
        where: { tenant_id: tenantId, admission_number },
      });

      if (existing) {
        throw new BadRequestException('Admission number already exists');
      }

      // Create user account for student
      const user = await queryRunner.manager.query(
        `INSERT INTO users (tenant_id, email, password_hash, role, first_name, last_name, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          tenantId,
          `${admission_number.toLowerCase()}@student.temp`, // Temporary email
          await this.hashPassword('Student@123'), // Default password
          'student',
          createStudentDto.first_name,
          createStudentDto.last_name,
          true,
        ],
      );

      // Create student record
      const student = this.studentRepository.create({
        ...createStudentDto,
        tenant_id: tenantId,
        user_id: user[0].id,
        admission_number,
        status: 'active',
      });

      const savedStudent = await queryRunner.manager.save(student);

      // Create parent account
      const parentUser = await queryRunner.manager.query(
        `INSERT INTO users (tenant_id, email, password_hash, role, first_name, last_name, phone, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          tenantId,
          createStudentDto.parent_email,
          await this.hashPassword('Parent@123'),
          'parent',
          createStudentDto.parent_first_name,
          createStudentDto.parent_last_name,
          createStudentDto.parent_phone,
          true,
        ],
      );

      // Create parent record
      await queryRunner.manager.query(
        `INSERT INTO parents (tenant_id, user_id, relationship) VALUES ($1, $2, $3)`,
        [tenantId, parentUser[0].id, createStudentDto.parent_relationship || 'parent'],
      );

      // Link student to parent
      const parent = await queryRunner.manager.query(
        `SELECT id FROM parents WHERE user_id = $1`,
        [parentUser[0].id],
      );

      await queryRunner.manager.query(
        `INSERT INTO student_parents (tenant_id, student_id, parent_id, is_primary_contact, can_receive_results) 
         VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, savedStudent.id, parent[0].id, true, true],
      );

      await queryRunner.commitTransaction();

      return savedStudent;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(tenantId: string, filters?: any): Promise<{ data: Student[]; total: number }> {
    const query = this.studentRepository.createQueryBuilder('student')
      .where('student.tenant_id = :tenantId', { tenantId });

    // Apply filters
    if (filters?.class_id) {
      query.andWhere('student.current_class_id = :class_id', { class_id: filters.class_id });
    }

    if (filters?.status) {
      query.andWhere('student.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      query.andWhere(
        '(student.first_name ILIKE :search OR student.last_name ILIKE :search OR student.admission_number ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    query.skip((page - 1) * limit).take(limit);

    // Sorting
    query.orderBy('student.first_name', 'ASC');

    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string, tenantId: string): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async update(id: string, updateStudentDto: UpdateStudentDto, tenantId: string): Promise<Student> {
    const student = await this.findOne(id, tenantId);

    Object.assign(student, updateStudentDto);

    return await this.studentRepository.save(student);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const student = await this.findOne(id, tenantId);
    await this.studentRepository.remove(student);
  }

  async bulkImport(file: Express.Multer.File, tenantId: string): Promise<{ success: number; failed: number; errors: any[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);

    const worksheet = workbook.getWorksheet(1);
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Skip header row
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);

      try {
        const studentData: any = {
          admission_number: row.getCell(1).value?.toString(),
          first_name: row.getCell(2).value?.toString(),
          last_name: row.getCell(3).value?.toString(),
          middle_name: row.getCell(4).value?.toString(),
          date_of_birth: row.getCell(5).value?.toString(),
          gender: row.getCell(6).value?.toString(),
          parent_email: row.getCell(8).value?.toString(),
          parent_first_name: row.getCell(9).value?.toString().split(' ')[0],
          parent_last_name: row.getCell(9).value?.toString().split(' ')[1] || '',
          parent_phone: row.getCell(10).value?.toString(),
        };

        // Find class by name
        const className = row.getCell(7).value?.toString();
        if (className) {
          const classResult = await this.dataSource.query(
            `SELECT id FROM classes WHERE tenant_id = $1 AND name = $2`,
            [tenantId, className],
          );
          if (classResult.length > 0) {
            studentData.current_class_id = classResult[0].id;
          }
        }

        await this.create(studentData, tenantId);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i,
          error: error.message,
        });
      }
    }

    return results;
  }

  async generateCSVTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');

    // Add headers
    worksheet.columns = [
      { header: 'Admission Number', key: 'admission_number', width: 20 },
      { header: 'First Name', key: 'first_name', width: 20 },
      { header: 'Last Name', key: 'last_name', width: 20 },
      { header: 'Middle Name', key: 'middle_name', width: 20 },
      { header: 'Date of Birth (YYYY-MM-DD)', key: 'date_of_birth', width: 25 },
      { header: 'Gender (male/female)', key: 'gender', width: 20 },
      { header: 'Class', key: 'class', width: 15 },
      { header: 'Parent Email', key: 'parent_email', width: 30 },
      { header: 'Parent Name', key: 'parent_name', width: 30 },
      { header: 'Parent Phone', key: 'parent_phone', width: 20 },
    ];

    // Add sample row
    worksheet.addRow({
      admission_number: 'SS/2024/001',
      first_name: 'John',
      last_name: 'Doe',
      middle_name: 'Paul',
      date_of_birth: '2010-05-15',
      gender: 'male',
      class: 'JSS 1A',
      parent_email: 'parent@example.com',
      parent_name: 'Jane Doe',
      parent_phone: '+2348012345678',
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  private async generateAdmissionNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.studentRepository.count({
      where: { tenant_id: tenantId },
    });

    return `SS/${year}/${String(count + 1).padStart(4, '0')}`;
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcrypt');
    return await bcrypt.hash(password, 10);
  }
}
