import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalSkillTemplateRepository } from './local-skill-template.repository';
import { SkillTemplateRecord } from './schema/skill-template.record';
import { AlwaysOnSkillTemplateRecord } from './schema/always-on-skill-template.record';
import { PreCreatedCopySkillTemplateRecord } from './schema/pre-created-copy-skill-template.record';
import { SkillTemplateMapper } from './mappers/skill-template.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SkillTemplateRecord,
      AlwaysOnSkillTemplateRecord,
      PreCreatedCopySkillTemplateRecord,
    ]),
  ],
  providers: [SkillTemplateMapper, LocalSkillTemplateRepository],
  exports: [LocalSkillTemplateRepository],
})
export class LocalSkillTemplateRepositoryModule {}
