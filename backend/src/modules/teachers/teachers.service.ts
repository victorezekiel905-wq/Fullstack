import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Teacher } from '../entities/teacher.entity';

export interface CreateTeacherDto {
  staffId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone?: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth?: Date;
  dateEmployed?: Date;
  qualification?: string;
  specialization?: string;
  subjectsTaught?: string[];
  classesAssigned?: string[];
  isClassTeacher?: boolean;
  classTeacherOf?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export interface UpdateTeacherDto extends Partial<CreateTeacherDto> {
  status?: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED';
}

@Injectable()
export class TeachersService {
  constructor(
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
  ) {}

  async create(tenantId: string, dto: CreateTeacherDto): Promise<Teacher> {
    const teacher = this.teacherRepository.create({
      tenantId,
      ...dto,
      status: 'ACTIVE',
    });

    return this.teacherRepository.save(teacher);
  }

  async findAll(
    tenantId: string,
    filters?: {
      status?: string;
      search?: string;
      classTeacher?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ teachers: Teacher[]; total: number }> {
    const where: any = { tenantId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.classTeacher !== undefined) {
      where.isClassTeacher = filters.classTeacher;
    }

    const queryBuilder = this.teacherRepository.createQueryBuilder('teacher')
      .where(where);

    if (filters?.search) {
      queryBuilder.andWhere(
        '(teacher.first_name ILIKE :search OR teacher.last_name ILIKE :search OR teacher.staff_id ILIKE :search OR teacher.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const total = await queryBuilder.getCount();

    if (filters?.limit) {
      queryBuilder.take(filters.limit);
    }

    if (filters?.offset) {
      queryBuilder.skip(filters.offset);
    }

    const teachers = await queryBuilder
      .orderBy('teacher.created_at', 'DESC')
      .getMany();

    return { teachers, total };
  }

  async findOne(tenantId: string, id: string): Promise<Teacher> {
    const teacher = await this.teacherRepository.findOne({
      where: { id, tenantId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  async update(tenantId: string, id: string, dto: UpdateTeacherDto): Promise<Teacher> {
    const teacher = await this.findOne(tenantId, id);

    Object.assign(teacher, dto);

    return this.teacherRepository.save(teacher);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const teacher = await this.findOne(tenantId, id);
    await this.teacherRepository.remove(teacher);
  }

  async assignSubjects(tenantId: string, teacherId: string, subjectIds: string[]): Promise<Teacher> {
    const teacher = await this.findOne(tenantId, teacherId);
    teacher.subjectsTaught = subjectIds;
    return this.teacherRepository.save(teacher);
  }

  async assignClasses(tenantId: string, teacherId: string, classIds: string[]): Promise<Teacher> {
    const teacher = await this.findOne(tenantId, teacherId);
    teacher.classesAssigned = classIds;
    return this.teacherRepository.save(teacher);
  }

  async assignAsClassTeacher(tenantId: string, teacherId: string, classId: string): Promise<Teacher> {
    // First, remove class teacher status from any other teacher for this class
    await this.teacherRepository.update(
      { tenantId, classTeacherOf: classId },
      { isClassTeacher: false, classTeacherOf: null },
    );

    // Assign new class teacher
    const teacher = await this.findOne(tenantId, teacherId);
    teacher.isClassTeacher = true;
    teacher.classTeacherOf = classId;

    return this.teacherRepository.save(teacher);
  }

  async getTeachersBySubject(tenantId: string, subjectId: string): Promise<Teacher[]> {
    return this.teacherRepository
      .createQueryBuilder('teacher')
      .where('teacher.tenant_id = :tenantId', { tenantId })
      .andWhere(':subjectId = ANY(teacher.subjects_taught)', { subjectId })
      .andWhere('teacher.status = :status', { status: 'ACTIVE' })
      .getMany();
  }

  async getTeachersByClass(tenantId: string, classId: string): Promise<Teacher[]> {
    return this.teacherRepository
      .createQueryBuilder('teacher')
      .where('teacher.tenant_id = :tenantId', { tenantId })
      .andWhere(':classId = ANY(teacher.classes_assigned)', { classId })
      .andWhere('teacher.status = :status', { status: 'ACTIVE' })
      .getMany();
  }

  async getClassTeacher(tenantId: string, classId: string): Promise<Teacher | null> {
    return this.teacherRepository.findOne({
      where: { tenantId, classTeacherOf: classId, isClassTeacher: true },
    });
  }

  async getStatistics(tenantId: string): Promise<any> {
    const total = await this.teacherRepository.count({ where: { tenantId } });
    const active = await this.teacherRepository.count({ where: { tenantId, status: 'ACTIVE' } });
    const onLeave = await this.teacherRepository.count({ where: { tenantId, status: 'ON_LEAVE' } });
    const classTeachers = await this.teacherRepository.count({ where: { tenantId, isClassTeacher: true } });

    return {
      total,
      active,
      onLeave,
      classTeachers,
      inactiveRate: total > 0 ? ((total - active) / total) * 100 : 0,
    };
  }
}
