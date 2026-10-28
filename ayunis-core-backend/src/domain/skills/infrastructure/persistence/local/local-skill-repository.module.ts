import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalSkillRepository } from './local-skill.repository';
import { SkillRecord } from './schema/skill.record';
import { SkillActivationRecord } from './schema/skill-activation.record';
import { SkillMapper } from './mappers/skill.mapper';
import { LocalSkillAccessiblePageFinder } from './local-skill-accessible-page.finder';
import { LocalSkillKnowledgeBaseIdsFinder } from './local-skill-knowledge-base-ids.finder';

@Module({
  imports: [TypeOrmModule.forFeature([SkillRecord, SkillActivationRecord])],
  providers: [
    SkillMapper,
    LocalSkillAccessiblePageFinder,
    LocalSkillKnowledgeBaseIdsFinder,
    LocalSkillRepository,
  ],
  exports: [
    LocalSkillRepository,
    SkillMapper,
    LocalSkillAccessiblePageFinder,
    LocalSkillKnowledgeBaseIdsFinder,
  ],
})
export class LocalSkillRepositoryModule {}
