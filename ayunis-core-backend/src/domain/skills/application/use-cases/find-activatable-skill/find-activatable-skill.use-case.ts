import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import type { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { CollectiveSkill, Skill } from 'src/domain/skills/domain/skill';
import { isCollectiveSkill } from 'src/domain/skills/application/models/collective-skill-owner';
import type { Thread } from 'src/domain/threads/domain/thread.entity';

@Injectable()
export class FindActivatableSkillUseCase {
  private readonly logger = new Logger(FindActivatableSkillUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly context: ContextService,
    private readonly authorization: SkillAuthorizationService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(query: { skillId: UUID; thread: Thread }): Promise<Skill> {
    this.logger.debug(
      { skillId: query.skillId, threadId: query.thread.id },
      'Finding activatable skill',
    );
    const userId = this.context.get('userId');
    const orgId = this.context.get('orgId');
    if (!userId || !orgId || query.thread.userId !== userId) {
      throw new UnauthorizedAccessError();
    }
    if (query.thread.workspaceId) {
      const workspaceSkill = (
        await this.repository.findByIds(
          [query.skillId],
          query.thread.workspaceId,
        )
      ).at(0);
      if (workspaceSkill) {
        await this.authorization.requireExecution(
          workspaceSkill,
          query.thread.id,
        );
        await this.requireWorkspaceActivation(
          workspaceSkill.id,
          query.thread.workspaceId,
        );
        return workspaceSkill;
      }
    }
    return this.findAccessiblePersonalSkill(query.skillId, userId);
  }

  private async findAccessiblePersonalSkill(
    skillId: UUID,
    userId: UUID,
  ): Promise<PersonalSkill | CollectiveSkill> {
    const owned = await this.repository.findOne(skillId, userId);
    if (owned) return owned;
    const collective = await this.findUsableCollectiveSkill(skillId);
    if (!collective) throw new SkillNotFoundError(skillId);
    return collective;
  }

  private async findUsableCollectiveSkill(
    skillId: UUID,
  ): Promise<CollectiveSkill | null> {
    const skill = await this.repository.findById(skillId);
    if (!skill || !isCollectiveSkill(skill)) return null;
    await this.authorization.requireUse(skill);
    return skill;
  }

  private async requireWorkspaceActivation(
    skillId: UUID,
    workspaceId: UUID,
  ): Promise<void> {
    const states = await this.repository.getWorkspaceSkillStates(
      [skillId],
      workspaceId,
    );
    if (!states.get(skillId)?.isActive) throw new SkillNotFoundError(skillId);
  }
}
