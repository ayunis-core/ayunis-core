import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyChapterRecord } from './infrastructure/persistence/local/schema/academy-chapter.record';
import { AcademyCourseModuleRecord } from './infrastructure/persistence/local/schema/academy-course-module.record';
import { AcademyMapper } from './infrastructure/persistence/local/mappers/academy.mapper';
import { LocalAcademyChapterRepository } from './infrastructure/persistence/local/local-academy-chapter.repository';
import { LocalAcademyCourseModuleRepository } from './infrastructure/persistence/local/local-academy-course-module.repository';
import { AcademyChapterRepository } from './application/ports/academy-chapter.repository';
import { AcademyCourseModuleRepository } from './application/ports/academy-course-module.repository';
import { GetAcademyContentUseCase } from './application/use-cases/get-academy-content/get-academy-content.use-case';
import { CreateChapterUseCase } from './application/use-cases/create-chapter/create-chapter.use-case';
import { UpdateChapterUseCase } from './application/use-cases/update-chapter/update-chapter.use-case';
import { DeleteChapterUseCase } from './application/use-cases/delete-chapter/delete-chapter.use-case';
import { ReorderChaptersUseCase } from './application/use-cases/reorder-chapters/reorder-chapters.use-case';
import { CreateCourseModuleUseCase } from './application/use-cases/create-course-module/create-course-module.use-case';
import { UpdateCourseModuleUseCase } from './application/use-cases/update-course-module/update-course-module.use-case';
import { DeleteCourseModuleUseCase } from './application/use-cases/delete-course-module/delete-course-module.use-case';
import { ReorderCourseModulesUseCase } from './application/use-cases/reorder-course-modules/reorder-course-modules.use-case';
import { SuperAdminAcademyChaptersController } from './presenters/http/super-admin-academy-chapters.controller';
import { SuperAdminAcademyCourseModulesController } from './presenters/http/super-admin-academy-course-modules.controller';
import { AcademyChaptersController } from './presenters/http/academy-chapters.controller';
import { AcademyResponseDtoMapper } from './presenters/http/mappers/academy-response-dto.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([AcademyChapterRecord, AcademyCourseModuleRecord]),
  ],
  controllers: [
    AcademyChaptersController,
    SuperAdminAcademyChaptersController,
    SuperAdminAcademyCourseModulesController,
  ],
  providers: [
    AcademyResponseDtoMapper,
    AcademyMapper,
    LocalAcademyChapterRepository,
    LocalAcademyCourseModuleRepository,
    {
      provide: AcademyChapterRepository,
      useExisting: LocalAcademyChapterRepository,
    },
    {
      provide: AcademyCourseModuleRepository,
      useExisting: LocalAcademyCourseModuleRepository,
    },
    GetAcademyContentUseCase,
    CreateChapterUseCase,
    UpdateChapterUseCase,
    DeleteChapterUseCase,
    ReorderChaptersUseCase,
    CreateCourseModuleUseCase,
    UpdateCourseModuleUseCase,
    DeleteCourseModuleUseCase,
    ReorderCourseModulesUseCase,
  ],
  exports: [GetAcademyContentUseCase],
})
export class AcademyModule {}
