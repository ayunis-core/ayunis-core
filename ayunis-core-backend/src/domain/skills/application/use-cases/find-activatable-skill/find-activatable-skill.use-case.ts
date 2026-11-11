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
import { AbstractCollectiveSkill } from 'src/domain/skills/domain/collective-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
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
    const skill = await this.repository.findById(query.skillId);
    if (skill instanceof WorkspaceSkill) {
      return this.requireActiveWorkspaceSkill(skill, query.thread);
    }
    if (skill instanceof AbstractCollectiveSkill) {
      await this.authorization.requireExecution(skill, query.thread.id);
      if (!skill.isActive) throw new SkillNotFoundError(query.skillId);
      return skill;
    }
    if (skill instanceof PersonalSkill && skill.userId === userId) {
      return skill;
    }
    throw new SkillNotFoundError(query.skillId);
  }

  private async requireActiveWorkspaceSkill(
    skill: WorkspaceSkill,
    thread: Thread,
  ): Promise<WorkspaceSkill> {
    if (!thread.workspaceId || skill.workspaceId !== thread.workspaceId) {
      throw new SkillNotFoundError(skill.id);
    }
    await this.authorization.requireExecution(skill, thread.id);
    const states = await this.repository.getWorkspaceSkillStates(
      [skill.id],
      thread.workspaceId,
    );
    if (!states.get(skill.id)?.isActive) throw new SkillNotFoundError(skill.id);
    return skill;
  }
}
