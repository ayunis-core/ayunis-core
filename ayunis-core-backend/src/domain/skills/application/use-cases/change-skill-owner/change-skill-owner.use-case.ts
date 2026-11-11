import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { SkillOwnerChangeService } from 'src/domain/skills/application/services/skill-owner-change.service';
import {
  DuplicateSkillNameError,
  SkillNotFoundError,
  SkillOwnerChangeNotAllowedError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { findSkillByNameForOwner } from 'src/domain/skills/application/util/find-skill-by-name-for-owner';
import { AbstractCollectiveSkill } from 'src/domain/skills/domain/collective-skill.entity';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { RemoveKnowledgeBaseAssignmentsByOriginSkillCommand } from 'src/domain/threads/application/use-cases/remove-knowledge-base-assignments-by-origin-skill/remove-knowledge-base-assignments-by-origin-skill.command';
import { RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase } from 'src/domain/threads/application/use-cases/remove-knowledge-base-assignments-by-origin-skill/remove-knowledge-base-assignments-by-origin-skill.use-case';
import { RemoveSkillSourcesFromThreadsCommand } from 'src/domain/threads/application/use-cases/remove-skill-sources-from-threads/remove-skill-sources-from-threads.command';
import { RemoveSkillSourcesFromThreadsUseCase } from 'src/domain/threads/application/use-cases/remove-skill-sources-from-threads/remove-skill-sources-from-threads.use-case';
import {
  FindUserIdsOutsideAudienceQuery,
  type ResourceAudience,
} from 'src/iam/teams/application/use-cases/find-user-ids-outside-audience/find-user-ids-outside-audience.query';
import { FindUserIdsOutsideAudienceUseCase } from 'src/iam/teams/application/use-cases/find-user-ids-outside-audience/find-user-ids-outside-audience.use-case';
import { ChangeSkillOwnerCommand } from './change-skill-owner.command';

/**
 * Moves a skill between the caller, a team and the organization. Requires the
 * right to manage both the current and the new owner. Threads of everyone
 * outside the new owner's audience lose what the skill added to them.
 */
@Injectable()
export class ChangeSkillOwnerUseCase {
  private readonly logger = new Logger(ChangeSkillOwnerUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
    private readonly ownerChange: SkillOwnerChangeService,
    private readonly removeThreadAssignments: RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase,
    private readonly removeThreadSources: RemoveSkillSourcesFromThreadsUseCase,
    private readonly findUsersOutside: FindUserIdsOutsideAudienceUseCase,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  @Transactional()
  async execute(command: ChangeSkillOwnerCommand): Promise<Skill> {
    this.logger.log(
      { skillId: command.skillId, ownerType: command.owner.type },
      'Changing skill owner',
    );
    // The lock keeps a concurrent move or link change from interleaving with
    // the authorization and the write.
    const skill = await this.repository.findById(command.skillId, {
      lock: true,
    });
    if (!skill) throw new SkillNotFoundError(command.skillId);
    await this.authorization.requireWrite(skill);
    if (skill instanceof WorkspaceSkill) {
      throw new SkillOwnerChangeNotAllowedError(skill.id);
    }
    const plan = await this.ownerChange.plan(skill, command.owner);
    if (!plan.changed) return skill;
    await this.authorization.requireCreate(plan.target);
    await this.assertUniqueName(plan.target);

    const moved = await this.repository.update(plan.target, skill);
    const { userId, orgId } = getRequiredUserContext(this.context);
    await this.transferStateToMover(skill, moved, userId);
    for (const knowledgeBaseId of plan.unlinkedKnowledgeBaseIds) {
      await this.removeThreadAssignments.execute(
        new RemoveKnowledgeBaseAssignmentsByOriginSkillCommand(
          skill.id,
          null,
          knowledgeBaseId,
        ),
      );
    }
    await this.removeFromThreadsOutsideAudience(skill, moved, orgId);
    return moved;
  }

  private async assertUniqueName(target: Skill): Promise<void> {
    const existing = await findSkillByNameForOwner(
      this.repository,
      target,
      target.name,
    );
    if (existing && existing.id !== target.id) {
      throw new DuplicateSkillNameError(target.name);
    }
  }

  /**
   * Per-user activation only counts for personal skills. Rows left from an
   * earlier personal phase must not resurface when the skill moves back.
   */
  private async transferStateToMover(
    previous: Skill,
    moved: Skill,
    userId: UUID,
  ): Promise<void> {
    if (moved instanceof AbstractCollectiveSkill) {
      await this.repository.deactivateSkill(moved.id, userId);
      return;
    }
    if (!(previous instanceof AbstractCollectiveSkill)) return;
    await this.repository.deactivateAllExceptOwner(moved.id, userId);
    if (!previous.isActive) {
      await this.repository.deactivateSkill(moved.id, userId);
      return;
    }
    await this.repository.activateSkill(moved.id, userId);
    await this.repository.setSkillPinned(moved.id, userId, previous.isPinned);
  }

  /** Only a team or organization skill had users besides the mover. */
  private async removeFromThreadsOutsideAudience(
    previous: Skill,
    moved: Skill,
    orgId: UUID,
  ): Promise<void> {
    if (!(previous instanceof AbstractCollectiveSkill)) return;
    const userIds = await this.findUsersOutside.execute(
      new FindUserIdsOutsideAudienceQuery(orgId, this.audienceOf(moved)),
    );
    await this.removeThreadSources.execute(
      new RemoveSkillSourcesFromThreadsCommand(moved.id, userIds),
    );
    await this.removeThreadAssignments.execute(
      new RemoveKnowledgeBaseAssignmentsByOriginSkillCommand(moved.id, userIds),
    );
  }

  private audienceOf(skill: Skill): ResourceAudience {
    if (skill instanceof TeamSkill) {
      return { type: 'team', teamId: skill.teamId };
    }
    if (skill instanceof OrgSkill) {
      return { type: 'org', orgId: skill.orgId };
    }
    if (skill instanceof PersonalSkill) {
      return { type: 'user', userId: skill.userId };
    }
    throw new SkillOwnerChangeNotAllowedError(skill.id);
  }
}
