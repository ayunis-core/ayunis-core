import { Module } from '@nestjs/common';
import { LocalSkillTemplateRepositoryModule } from './infrastructure/persistence/local/local-skill-template-repository.module';
import { LocalSkillTemplateRepository } from './infrastructure/persistence/local/local-skill-template.repository';
import { SkillTemplateRepository } from './application/ports/skill-template.repository';
import { CreateSkillTemplateUseCase } from './application/use-cases/create-skill-template/create-skill-template.use-case';
import { UpdateSkillTemplateUseCase } from './application/use-cases/update-skill-template/update-skill-template.use-case';
import { DeleteSkillTemplateUseCase } from './application/use-cases/delete-skill-template/delete-skill-template.use-case';
import { FindAllSkillTemplatesUseCase } from './application/use-cases/find-all-skill-templates/find-all-skill-templates.use-case';
import { FindOneSkillTemplateUseCase } from './application/use-cases/find-one-skill-template/find-one-skill-template.use-case';
import { SuperAdminSkillTemplatesController } from './presenters/http/super-admin-skill-templates.controller';
import { SkillTemplateResponseMapper } from './presenters/http/mappers/skill-template-response.mapper';

@Module({
  imports: [LocalSkillTemplateRepositoryModule],
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
    SkillTemplateResponseMapper,
  ],
  exports: [FindAllSkillTemplatesUseCase],
})
export class SkillTemplatesModule {}
