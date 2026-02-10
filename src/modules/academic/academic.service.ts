import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';
import { AcademicSession } from '../entities/academic-session.entity';
import { Term } from '../entities/term.entity';

@Injectable()
export class AcademicService {
  constructor(
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(AcademicSession)
    private readonly sessionRepository: Repository<AcademicSession>,
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
  ) {}

  // ==================== CLASSES ====================
  
  async createClass(tenantId: string, dto: any): Promise<Class> {
    const classEntity = this.classRepository.create({
      tenantId,
      ...dto,
      currentStudents: 0,
      status: 'ACTIVE',
    });

    return this.classRepository.save(classEntity);
  }

  async findAllClasses(tenantId: string, filters?: any): Promise<Class[]> {
    const where: any = { tenantId };

    if (filters?.academicYear) {
      where.academicYear = filters.academicYear;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.academicLevel) {
      where.academicLevel = filters.academicLevel;
    }

    return this.classRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findClassById(tenantId: string, id: string): Promise<Class> {
    const classEntity = await this.classRepository.findOne({
      where: { id, tenantId },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    return classEntity;
  }

  async updateClass(tenantId: string, id: string, dto: any): Promise<Class> {
    const classEntity = await this.findClassById(tenantId, id);
    Object.assign(classEntity, dto);
    return this.classRepository.save(classEntity);
  }

  async deleteClass(tenantId: string, id: string): Promise<void> {
    const classEntity = await this.findClassById(tenantId, id);
    await this.classRepository.remove(classEntity);
  }

  async assignSubjectsToClass(tenantId: string, classId: string, subjectIds: string[]): Promise<Class> {
    const classEntity = await this.findClassById(tenantId, classId);
    classEntity.subjects = subjectIds;
    return this.classRepository.save(classEntity);
  }

  // ==================== SUBJECTS ====================
  
  async createSubject(tenantId: string, dto: any): Promise<Subject> {
    const subject = this.subjectRepository.create({
      tenantId,
      ...dto,
      status: 'ACTIVE',
    });

    return this.subjectRepository.save(subject);
  }

  async findAllSubjects(tenantId: string, filters?: any): Promise<Subject[]> {
    const where: any = { tenantId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.subjectType) {
      where.subjectType = filters.subjectType;
    }

    return this.subjectRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findSubjectById(tenantId: string, id: string): Promise<Subject> {
    const subject = await this.subjectRepository.findOne({
      where: { id, tenantId },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return subject;
  }

  async updateSubject(tenantId: string, id: string, dto: any): Promise<Subject> {
    const subject = await this.findSubjectById(tenantId, id);
    Object.assign(subject, dto);
    return this.subjectRepository.save(subject);
  }

  async deleteSubject(tenantId: string, id: string): Promise<void> {
    const subject = await this.findSubjectById(tenantId, id);
    await this.subjectRepository.remove(subject);
  }

  // ==================== ACADEMIC SESSIONS ====================
  
  async createSession(tenantId: string, dto: any): Promise<AcademicSession> {
    const session = this.sessionRepository.create({
      tenantId,
      ...dto,
      status: 'ACTIVE',
    });

    return this.sessionRepository.save(session);
  }

  async findAllSessions(tenantId: string): Promise<AcademicSession[]> {
    return this.sessionRepository.find({
      where: { tenantId },
      order: { startDate: 'DESC' },
    });
  }

  async findSessionById(tenantId: string, id: string): Promise<AcademicSession> {
    const session = await this.sessionRepository.findOne({
      where: { id, tenantId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async getCurrentSession(tenantId: string): Promise<AcademicSession | null> {
    return this.sessionRepository.findOne({
      where: { tenantId, isCurrent: true },
    });
  }

  async setCurrentSession(tenantId: string, sessionId: string): Promise<AcademicSession> {
    // Remove current flag from all sessions
    await this.sessionRepository.update({ tenantId, isCurrent: true }, { isCurrent: false });

    // Set new current session
    const session = await this.findSessionById(tenantId, sessionId);
    session.isCurrent = true;
    return this.sessionRepository.save(session);
  }

  // ==================== TERMS ====================
  
  async createTerm(tenantId: string, dto: any): Promise<Term> {
    const term = this.termRepository.create({
      tenantId,
      ...dto,
      status: 'ACTIVE',
    });

    return this.termRepository.save(term);
  }

  async findAllTerms(tenantId: string, sessionId?: string): Promise<Term[]> {
    const where: any = { tenantId };

    if (sessionId) {
      where.sessionId = sessionId;
    }

    return this.termRepository.find({
      where,
      order: { startDate: 'ASC' },
    });
  }

  async findTermById(tenantId: string, id: string): Promise<Term> {
    const term = await this.termRepository.findOne({
      where: { id, tenantId },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    return term;
  }

  async getCurrentTerm(tenantId: string): Promise<Term | null> {
    return this.termRepository.findOne({
      where: { tenantId, isCurrent: true },
    });
  }

  async setCurrentTerm(tenantId: string, termId: string): Promise<Term> {
    // Remove current flag from all terms
    await this.termRepository.update({ tenantId, isCurrent: true }, { isCurrent: false });

    // Set new current term
    const term = await this.findTermById(tenantId, termId);
    term.isCurrent = true;
    return this.termRepository.save(term);
  }

  // ==================== STATISTICS ====================
  
  async getAcademicStatistics(tenantId: string): Promise<any> {
    const totalClasses = await this.classRepository.count({ where: { tenantId } });
    const activeClasses = await this.classRepository.count({ where: { tenantId, status: 'ACTIVE' } });
    const totalSubjects = await this.subjectRepository.count({ where: { tenantId } });
    const currentSession = await this.getCurrentSession(tenantId);
    const currentTerm = await this.getCurrentTerm(tenantId);

    return {
      totalClasses,
      activeClasses,
      totalSubjects,
      currentSession: currentSession ? {
        id: currentSession.id,
        name: currentSession.name,
      } : null,
      currentTerm: currentTerm ? {
        id: currentTerm.id,
        name: currentTerm.displayName,
      } : null,
    };
  }
}
