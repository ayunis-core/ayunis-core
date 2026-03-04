import { Module } from '@nestjs/common';
import { SkillsModule } from 'src/domain/skills/skills.module';
import { LocalSkillTemplateRepositoryModule } from './infrastructure/persistence/local/local-skill-template-repository.module';
import { LocalSkillTemplateRepository } from './infrastructure/persistence/local/local-skill-template.repository';
import { SkillTemplateRepository } from './application/ports/skill-template.repository';
import { CreateSkillTemplateUseCase } from './application/use-cases/create-skill-template/create-skill-template.use-case';
import { UpdateSkillTemplateUseCase } from './application/use-cases/update-skill-template/update-skill-template.use-case';
import { DeleteSkillTemplateUseCase } from './application/use-cases/delete-skill-template/delete-skill-template.use-case';
import { FindAllSkillTemplatesUseCase } from './application/use-cases/find-all-skill-templates/find-all-skill-templates.use-case';
import { FindOneSkillTemplateUseCase } from './application/use-cases/find-one-skill-template/find-one-skill-template.use-case';
import { FindActiveAlwaysOnTemplatesUseCase } from './application/use-cases/find-active-always-on-templates/find-active-always-on-templates.use-case';
import { FindActivePreCreatedTemplatesUseCase } from './application/use-cases/find-active-pre-created-templates/find-active-pre-created-templates.use-case';
import { SkillTemplateInstallationService } from './application/services/skill-template-installation.service';
import { SkillTemplateUserCreatedListener } from './application/listeners/user-created.listener';
import { SuperAdminSkillTemplatesController } from './presenters/http/super-admin-skill-templates.controller';
import { SkillTemplateResponseMapper } from './presenters/http/mappers/skill-template-response.mapper';

@Module({
  imports: [LocalSkillTemplateRepositoryModule, SkillsModule],
  controllers: [SuperAdminSkillTemplatesController],
  providers: [
    {
      provide: SkillTemplateRepository,
      useExisting: LocalSkillTemplateRepository,
    },
    CreateSkillTemplateUseCase,
    UpdateSkillTemplateUseCase,
    DeleteSkillTemplateUseCase,
    FindAllSkillTemplatesUseCase,
    FindOneSkillTemplateUseCase,
    FindActiveAlwaysOnTemplatesUseCase,
    FindActivePreCreatedTemplatesUseCase,
    SkillTemplateInstallationService,
    SkillTemplateUserCreatedListener,
    SkillTemplateResponseMapper,
  ],
  exports: [FindAllSkillTemplatesUseCase, FindActiveAlwaysOnTemplatesUseCase],
})
export class SkillTemplatesModule {}
