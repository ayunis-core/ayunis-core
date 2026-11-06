import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalSkillRepository } from './local-skill.repository';
import { SkillRecord } from './schema/skill.record';
import { SkillActivationRecord } from './schema/skill-activation.record';
import { SkillMapper } from './mappers/skill.mapper';
import { LocalSkillAccessiblePageFinder } from './local-skill-accessible-page.finder';
import { LocalSkillKnowledgeBaseIdsFinder } from './local-skill-knowledge-base-ids.finder';
import { LocalCollectiveSkillFinder } from './local-collective-skill.finder';

@Module({
  imports: [TypeOrmModule.forFeature([SkillRecord, SkillActivationRecord])],
  providers: [
    SkillMapper,
    LocalSkillAccessiblePageFinder,
    LocalSkillKnowledgeBaseIdsFinder,
    LocalCollectiveSkillFinder,
    LocalSkillRepository,
  ],
  exports: [
    LocalSkillRepository,
    SkillMapper,
    LocalSkillAccessiblePageFinder,
    LocalSkillKnowledgeBaseIdsFinder,
    LocalCollectiveSkillFinder,
  ],
})
export class LocalSkillRepositoryModule {}
