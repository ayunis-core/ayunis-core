import { Module } from '@nestjs/common';
import { LocalSkillTemplateRepositoryModule } from './infrastructure/persistence/local/local-skill-template-repository.module';
import { LocalSkillTemplateRepository } from './infrastructure/persistence/local/local-skill-template.repository';
import { SkillTemplateRepository } from './application/ports/skill-template.repository';

@Module({
  imports: [LocalSkillTemplateRepositoryModule],
  providers: [
    {
      provide: SkillTemplateRepository,
      useExisting: LocalSkillTemplateRepository,
    },
  ],
  exports: [],
})
export class SkillTemplatesModule {}
