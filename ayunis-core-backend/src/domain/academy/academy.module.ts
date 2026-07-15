import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/iam/users/users.module';
import { AcademyChapterRecord } from './infrastructure/persistence/local/schema/academy-chapter.record';
import { AcademyChapterProgressRecord } from './infrastructure/persistence/local/schema/academy-chapter-progress.record';
import { AcademyCompletionRecord } from './infrastructure/persistence/local/schema/academy-completion.record';
import { AcademyCourseModuleRecord } from './infrastructure/persistence/local/schema/academy-course-module.record';
import { AcademyQuizQuestionRecord } from './infrastructure/persistence/local/schema/academy-quiz-question.record';
import { AcademyMapper } from './infrastructure/persistence/local/mappers/academy.mapper';
import { LocalAcademyChapterRepository } from './infrastructure/persistence/local/local-academy-chapter.repository';
import { LocalAcademyChapterProgressRepository } from './infrastructure/persistence/local/local-academy-chapter-progress.repository';
import { LocalAcademyCompletionRepository } from './infrastructure/persistence/local/local-academy-completion.repository';
import { LocalAcademyCourseModuleRepository } from './infrastructure/persistence/local/local-academy-course-module.repository';
import { LocalAcademyQuizQuestionRepository } from './infrastructure/persistence/local/local-academy-quiz-question.repository';
import { PuppeteerCertificateRendererService } from './infrastructure/certificate/puppeteer-certificate-renderer.service';
import { CertificateRendererPort } from './application/ports/certificate-renderer.port';
import { AcademyChapterRepository } from './application/ports/academy-chapter.repository';
import { AcademyChapterProgressRepository } from './application/ports/academy-chapter-progress.repository';
import { AcademyCompletionRepository } from './application/ports/academy-completion.repository';
import { AcademyCourseModuleRepository } from './application/ports/academy-course-module.repository';
import { AcademyQuizQuestionRepository } from './application/ports/academy-quiz-question.repository';
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
import { CreateQuizQuestionUseCase } from './application/use-cases/create-quiz-question/create-quiz-question.use-case';
import { UpdateQuizQuestionUseCase } from './application/use-cases/update-quiz-question/update-quiz-question.use-case';
import { DeleteQuizQuestionUseCase } from './application/use-cases/delete-quiz-question/delete-quiz-question.use-case';
import { GetChapterQuizUseCase } from './application/use-cases/get-chapter-quiz/get-chapter-quiz.use-case';
import { SubmitChapterQuizUseCase } from './application/use-cases/submit-chapter-quiz/submit-chapter-quiz.use-case';
import { GetAcademyProgressUseCase } from './application/use-cases/get-academy-progress/get-academy-progress.use-case';
import { GetAcademyCertificateUseCase } from './application/use-cases/get-academy-certificate/get-academy-certificate.use-case';
import { SuperAdminAcademyChaptersController } from './presenters/http/super-admin-academy-chapters.controller';
import { SuperAdminAcademyCourseModulesController } from './presenters/http/super-admin-academy-course-modules.controller';
import { SuperAdminAcademyQuizQuestionsController } from './presenters/http/super-admin-academy-quiz-questions.controller';
import { AcademyChaptersController } from './presenters/http/academy-chapters.controller';
import { AcademyQuizController } from './presenters/http/academy-quiz.controller';
import { AcademyCertificateController } from './presenters/http/academy-certificate.controller';
import { AcademyResponseDtoMapper } from './presenters/http/mappers/academy-response-dto.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AcademyChapterRecord,
      AcademyCourseModuleRecord,
      AcademyQuizQuestionRecord,
      AcademyChapterProgressRecord,
      AcademyCompletionRecord,
    ]),
    UsersModule,
  ],
  controllers: [
    AcademyChaptersController,
    AcademyQuizController,
    AcademyCertificateController,
    SuperAdminAcademyChaptersController,
    SuperAdminAcademyCourseModulesController,
    SuperAdminAcademyQuizQuestionsController,
  ],
  providers: [
    AcademyResponseDtoMapper,
    AcademyMapper,
    LocalAcademyChapterRepository,
    LocalAcademyCourseModuleRepository,
    LocalAcademyQuizQuestionRepository,
    LocalAcademyChapterProgressRepository,
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
      provide: AcademyQuizQuestionRepository,
      useExisting: LocalAcademyQuizQuestionRepository,
    },
    {
      provide: AcademyChapterProgressRepository,
      useExisting: LocalAcademyChapterProgressRepository,
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
    CreateQuizQuestionUseCase,
    UpdateQuizQuestionUseCase,
    DeleteQuizQuestionUseCase,
    GetChapterQuizUseCase,
    SubmitChapterQuizUseCase,
    GetAcademyProgressUseCase,
    GetAcademyCertificateUseCase,
  ],
  exports: [
    GetAcademyContentUseCase,
    GetAcademyProgressUseCase,
    SubmitChapterQuizUseCase,
  ],
})
export class AcademyModule {}
