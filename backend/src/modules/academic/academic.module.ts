import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from './entities/class.entity';
import { Subject } from './entities/subject.entity';
import { AcademicSession } from './entities/academic-session.entity';
import { Term } from './entities/term.entity';
import { AcademicService } from './academic.service';
import { AcademicController } from './academic.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Class,
      Subject,
      AcademicSession,
      Term,
    ]),
  ],
  controllers: [AcademicController],
  providers: [AcademicService],
  exports: [AcademicService],
})
export class AcademicModule {}
