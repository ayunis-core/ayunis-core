import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalSkillRepository } from './local-skill.repository';
import { SkillRecord } from './schema/skill.record';
import { SkillActivationRecord } from './schema/skill-activation.record';
import { SkillMapper } from './mappers/skill.mapper';
import { LocalSkillAccessiblePageFinder } from './local-skill-accessible-page.finder';
import { LocalCollectiveSkillRepository } from './local-collective-skill.repository';
import { LocalWorkspaceSkillLinkRepository } from './local-workspace-skill-link.repository';
import { WorkspaceSkillLinkRecord } from './schema/workspace-skill-link.record';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SkillRecord,
      SkillActivationRecord,
      WorkspaceSkillLinkRecord,
    ]),
  ],
  providers: [
    SkillMapper,
    LocalSkillAccessiblePageFinder,
    LocalSkillRepository,
    LocalCollectiveSkillRepository,
    LocalWorkspaceSkillLinkRepository,
  ],
  exports: [
    LocalSkillRepository,
    LocalCollectiveSkillRepository,
    LocalWorkspaceSkillLinkRepository,
    SkillMapper,
    LocalSkillAccessiblePageFinder,
  ],
})
export class LocalSkillRepositoryModule {}
