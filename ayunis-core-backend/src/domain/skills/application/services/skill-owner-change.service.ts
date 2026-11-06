import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  getRequiredUserContext,
  type UserContext,
} from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { FindKnowledgeBasesByIdsUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-bases-by-ids/find-knowledge-bases-by-ids.use-case';
import type { SkillTransferOwner } from 'src/domain/skills/application/models/skill-owner';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { isSameOwner } from 'src/domain/skills/application/util/is-same-owner';
import {
  AbstractCollectiveSkill,
  type CollectiveSkillState,
} from 'src/domain/skills/domain/collective-skill.entity';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import type { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';

export interface SkillOwnerChangePlan {
  changed: boolean;
  target: Skill;
  /** Knowledge bases whose link is dropped because their owner differs. */
  unlinkedKnowledgeBaseIds: UUID[];
}

/**
 * Plans moving a skill to another owner: the moved skill keeps its id, content
 * and resources, takes over the mover's state when it becomes collectively
 * owned, and keeps only knowledge-base links of the same owner.
 */
@Injectable()
export class SkillOwnerChangeService {
  constructor(
    private readonly repository: SkillRepository,
    private readonly findKnowledgeBases: FindKnowledgeBasesByIdsUseCase,
    private readonly context: ContextService,
  ) {}

  async plan(
    skill: Exclude<Skill, WorkspaceSkill>,
    owner: SkillTransferOwner,
  ): Promise<SkillOwnerChangePlan> {
    const user = getRequiredUserContext(this.context);
    if (this.isCurrentOwner(skill, owner, user)) {
      return { changed: false, target: skill, unlinkedKnowledgeBaseIds: [] };
    }
    const state = await this.stateFor(skill, user.userId);
    const moved = this.reown(skill, owner, user, state);
    const knowledgeBases = await this.findKnowledgeBases.execute({
      knowledgeBaseIds: skill.knowledgeBaseIds,
    });
    const keptIds = new Set(
      knowledgeBases
        .filter((knowledgeBase) => isSameOwner(moved, knowledgeBase))
        .map(({ id }) => id),
    );
    return {
      changed: true,
      target: moved.withUpdates({
        knowledgeBaseIds: skill.knowledgeBaseIds.filter((id) =>
          keptIds.has(id),
        ),
      }),
      unlinkedKnowledgeBaseIds: skill.knowledgeBaseIds.filter(
        (id) => !keptIds.has(id),
      ),
    };
  }

  private isCurrentOwner(
    skill: Skill,
    owner: SkillTransferOwner,
    user: UserContext,
  ): boolean {
    switch (owner.type) {
      case 'personal':
        return skill instanceof PersonalSkill && skill.userId === user.userId;
      case 'team':
        return skill instanceof TeamSkill && skill.teamId === owner.teamId;
      case 'org':
        return skill instanceof OrgSkill;
    }
  }

  private async stateFor(
    skill: Skill,
    userId: UUID,
  ): Promise<CollectiveSkillState> {
    if (skill instanceof AbstractCollectiveSkill) {
      return { isActive: skill.isActive, isPinned: skill.isPinned };
    }
    const [isActive, isPinned] = await Promise.all([
      this.repository.isSkillActive(skill.id, userId),
      this.repository.isSkillPinned(skill.id, userId),
    ]);
    return { isActive, isPinned };
  }

  private reown(
    skill: Skill,
    owner: SkillTransferOwner,
    user: UserContext,
    state: CollectiveSkillState,
  ): Skill {
    const params = {
      id: skill.id,
      name: skill.name,
      shortDescription: skill.shortDescription,
      instructions: skill.instructions,
      sourceIds: skill.sourceIds,
      mcpIntegrationIds: skill.mcpIntegrationIds,
      knowledgeBaseIds: skill.knowledgeBaseIds,
      marketplaceIdentifier: skill.marketplaceIdentifier,
      createdAt: skill.createdAt,
      updatedAt: new Date(),
    };
    switch (owner.type) {
      case 'personal':
        return new PersonalSkill({ ...params, userId: user.userId });
      case 'team':
        return new TeamSkill({ ...params, ...state, teamId: owner.teamId });
      case 'org':
        return new OrgSkill({ ...params, ...state, orgId: user.orgId });
    }
  }
}
