import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/iam/users/users.module';
import { AcademyChapterRecord } from './infrastructure/persistence/local/schema/academy-chapter.record';
import { AcademyChapterConfirmationRecord } from './infrastructure/persistence/local/schema/academy-chapter-confirmation.record';
import { AcademyCompletionRecord } from './infrastructure/persistence/local/schema/academy-completion.record';
import { AcademyCourseModuleRecord } from './infrastructure/persistence/local/schema/academy-course-module.record';
import { AcademyMapper } from './infrastructure/persistence/local/mappers/academy.mapper';
import { LocalAcademyChapterRepository } from './infrastructure/persistence/local/local-academy-chapter.repository';
import { LocalAcademyChapterConfirmationRepository } from './infrastructure/persistence/local/local-academy-chapter-confirmation.repository';
import { LocalAcademyCompletionRepository } from './infrastructure/persistence/local/local-academy-completion.repository';
import { LocalAcademyCourseModuleRepository } from './infrastructure/persistence/local/local-academy-course-module.repository';
import { PuppeteerCertificateRendererService } from './infrastructure/certificate/puppeteer-certificate-renderer.service';
import { CertificateRendererPort } from './application/ports/certificate-renderer.port';
import { AcademyChapterRepository } from './application/ports/academy-chapter.repository';
import { AcademyChapterConfirmationRepository } from './application/ports/academy-chapter-confirmation.repository';
import { AcademyCompletionRepository } from './application/ports/academy-completion.repository';
import { AcademyCourseModuleRepository } from './application/ports/academy-course-module.repository';
import { GetAcademyContentUseCase } from './application/use-cases/get-academy-content/get-academy-content.use-case';
import { GetAcademyManagementContentUseCase } from './application/use-cases/get-academy-management-content/get-academy-management-content.use-case';
import { CreateChapterUseCase } from './application/use-cases/create-chapter/create-chapter.use-case';
import { UpdateChapterUseCase } from './application/use-cases/update-chapter/update-chapter.use-case';
import { DeleteChapterUseCase } from './application/use-cases/delete-chapter/delete-chapter.use-case';
import { ReorderChaptersUseCase } from './application/use-cases/reorder-chapters/reorder-chapters.use-case';
import { CreateCourseModuleUseCase } from './application/use-cases/create-course-module/create-course-module.use-case';
import { UpdateCourseModuleUseCase } from './application/use-cases/update-course-module/update-course-module.use-case';
import { DeleteCourseModuleUseCase } from './application/use-cases/delete-course-module/delete-course-module.use-case';
import { ReorderCourseModulesUseCase } from './application/use-cases/reorder-course-modules/reorder-course-modules.use-case';
import { ConfirmChapterUseCase } from './application/use-cases/confirm-chapter/confirm-chapter.use-case';
import { GetAcademyProgressUseCase } from './application/use-cases/get-academy-progress/get-academy-progress.use-case';
import { GetAcademyCompletionUseCase } from './application/use-cases/get-academy-completion/get-academy-completion.use-case';
import { GetAcademyCompletionsUseCase } from './application/use-cases/get-academy-completions/get-academy-completions.use-case';
import { GetAcademyCertificateUseCase } from './application/use-cases/get-academy-certificate/get-academy-certificate.use-case';
import { SuperAdminAcademyChaptersController } from './presenters/http/super-admin-academy-chapters.controller';
import { SuperAdminAcademyCourseModulesController } from './presenters/http/super-admin-academy-course-modules.controller';
import { AcademyChaptersController } from './presenters/http/academy-chapters.controller';
import { AcademyProgressController } from './presenters/http/academy-progress.controller';
import { AcademyCertificateController } from './presenters/http/academy-certificate.controller';
import { AcademyResponseDtoMapper } from './presenters/http/mappers/academy-response-dto.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AcademyChapterRecord,
      AcademyCourseModuleRecord,
      AcademyChapterConfirmationRecord,
      AcademyCompletionRecord,
    ]),
    UsersModule,
  ],
  controllers: [
    AcademyChaptersController,
    AcademyProgressController,
    AcademyCertificateController,
    SuperAdminAcademyChaptersController,
    SuperAdminAcademyCourseModulesController,
  ],
  providers: [
    AcademyResponseDtoMapper,
    AcademyMapper,
    LocalAcademyChapterRepository,
    LocalAcademyCourseModuleRepository,
    LocalAcademyChapterConfirmationRepository,
    LocalAcademyCompletionRepository,
    {
      provide: AcademyChapterRepository,
      useExisting: LocalAcademyChapterRepository,
    },
    {
      provide: AcademyCourseModuleRepository,
      useExisting: LocalAcademyCourseModuleRepository,
    },
    {
      provide: AcademyChapterConfirmationRepository,
      useExisting: LocalAcademyChapterConfirmationRepository,
    },
    {
      provide: AcademyCompletionRepository,
      useExisting: LocalAcademyCompletionRepository,
    },
    PuppeteerCertificateRendererService,
    {
      provide: CertificateRendererPort,
      useExisting: PuppeteerCertificateRendererService,
    },
    GetAcademyContentUseCase,
    GetAcademyManagementContentUseCase,
    CreateChapterUseCase,
    UpdateChapterUseCase,
    DeleteChapterUseCase,
    ReorderChaptersUseCase,
    CreateCourseModuleUseCase,
    UpdateCourseModuleUseCase,
    DeleteCourseModuleUseCase,
    ReorderCourseModulesUseCase,
    ConfirmChapterUseCase,
    GetAcademyProgressUseCase,
    GetAcademyCompletionUseCase,
    GetAcademyCompletionsUseCase,
    GetAcademyCertificateUseCase,
  ],
  exports: [
    GetAcademyContentUseCase,
    GetAcademyProgressUseCase,
    GetAcademyCompletionUseCase,
    GetAcademyCompletionsUseCase,
    ConfirmChapterUseCase,
  ],
})
export class AcademyModule {}
