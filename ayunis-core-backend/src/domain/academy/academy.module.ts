import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyChapterRecord } from './infrastructure/persistence/local/schema/academy-chapter.record';
import { AcademyLessonRecord } from './infrastructure/persistence/local/schema/academy-lesson.record';
import { AcademyMapper } from './infrastructure/persistence/local/mappers/academy.mapper';
import { LocalAcademyChapterRepository } from './infrastructure/persistence/local/local-academy-chapter.repository';
import { LocalAcademyLessonRepository } from './infrastructure/persistence/local/local-academy-lesson.repository';
import { AcademyChapterRepository } from './application/ports/academy-chapter.repository';
import { AcademyLessonRepository } from './application/ports/academy-lesson.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([AcademyChapterRecord, AcademyLessonRecord]),
  ],
  providers: [
    AcademyMapper,
    LocalAcademyChapterRepository,
    LocalAcademyLessonRepository,
    {
      provide: AcademyChapterRepository,
      useExisting: LocalAcademyChapterRepository,
    },
    {
      provide: AcademyLessonRepository,
      useExisting: LocalAcademyLessonRepository,
    },
  ],
})
export class AcademyModule {}
