import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyChapterRecord } from './infrastructure/persistence/local/schema/academy-chapter.record';
import { AcademyLessonRecord } from './infrastructure/persistence/local/schema/academy-lesson.record';
import { AcademyMapper } from './infrastructure/persistence/local/mappers/academy.mapper';
import { LocalAcademyChapterRepository } from './infrastructure/persistence/local/local-academy-chapter.repository';
import { LocalAcademyLessonRepository } from './infrastructure/persistence/local/local-academy-lesson.repository';
import { AcademyChapterRepository } from './application/ports/academy-chapter.repository';
import { AcademyLessonRepository } from './application/ports/academy-lesson.repository';
import { GetAcademyContentUseCase } from './application/use-cases/get-academy-content/get-academy-content.use-case';
import { CreateChapterUseCase } from './application/use-cases/create-chapter/create-chapter.use-case';
import { UpdateChapterUseCase } from './application/use-cases/update-chapter/update-chapter.use-case';
import { DeleteChapterUseCase } from './application/use-cases/delete-chapter/delete-chapter.use-case';
import { ReorderChaptersUseCase } from './application/use-cases/reorder-chapters/reorder-chapters.use-case';
import { CreateLessonUseCase } from './application/use-cases/create-lesson/create-lesson.use-case';
import { UpdateLessonUseCase } from './application/use-cases/update-lesson/update-lesson.use-case';
import { DeleteLessonUseCase } from './application/use-cases/delete-lesson/delete-lesson.use-case';
import { ReorderLessonsUseCase } from './application/use-cases/reorder-lessons/reorder-lessons.use-case';

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
    GetAcademyContentUseCase,
    CreateChapterUseCase,
    UpdateChapterUseCase,
    DeleteChapterUseCase,
    ReorderChaptersUseCase,
    CreateLessonUseCase,
    UpdateLessonUseCase,
    DeleteLessonUseCase,
    ReorderLessonsUseCase,
  ],
  exports: [GetAcademyContentUseCase],
})
export class AcademyModule {}
