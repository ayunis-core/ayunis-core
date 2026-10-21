import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalSkillRepository } from './local-skill.repository';
import { SkillRecord } from './schema/skill.record';
import { SkillActivationRecord } from './schema/skill-activation.record';
import { SkillMapper } from './mappers/skill.mapper';
import { LocalSkillAccessiblePageFinder } from './local-skill-accessible-page.finder';
import { LocalCollectiveSkillRepository } from './local-collective-skill.repository';

@Module({
  imports: [TypeOrmModule.forFeature([SkillRecord, SkillActivationRecord])],
  providers: [
    SkillMapper,
    LocalSkillAccessiblePageFinder,
    LocalSkillRepository,
    LocalCollectiveSkillRepository,
  ],
  exports: [
    LocalSkillRepository,
    LocalCollectiveSkillRepository,
    SkillMapper,
    LocalSkillAccessiblePageFinder,
  ],
})
export class LocalSkillRepositoryModule {}
