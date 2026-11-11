import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { AbstractCollectiveSkill } from 'src/domain/skills/domain/collective-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { AssertWorkspaceExecutionAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-execution-access/assert-workspace-execution-access.use-case';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { CollectiveSkillAccessService } from 'src/domain/skills/application/services/collective-skill-access.service';

@Injectable()
export class SkillAuthorizationService {
  constructor(
    @Inject(forwardRef(() => AssertWorkspaceReadAccessUseCase))
    private readonly workspaceRead: AssertWorkspaceReadAccessUseCase,
    @Inject(forwardRef(() => AssertWorkspaceWriteAccessUseCase))
    private readonly workspaceWrite: AssertWorkspaceWriteAccessUseCase,
    @Inject(forwardRef(() => AssertWorkspaceExecutionAccessUseCase))
    private readonly workspaceExecution: AssertWorkspaceExecutionAccessUseCase,
    private readonly context: ContextService,
    private readonly collectiveAccess: CollectiveSkillAccessService,
  ) {}

  async requireRead(skill: Skill): Promise<void> {
    const skillId = skill.id;
    const userId = this.requirePrincipal();
    if (skill instanceof PersonalSkill) {
      if (skill.userId !== userId) throw new SkillNotFoundError(skill.id);
      return;
    }
    if (skill instanceof AbstractCollectiveSkill) {
      return this.collectiveAccess.requireRead(skill);
    }
    if (!(skill instanceof WorkspaceSkill)) {
      throw new SkillNotFoundError(skillId);
    }
    await this.authorizeWorkspace(skill, () =>
      this.workspaceRead.execute({ workspaceId: skill.workspaceId }),
    );
  }

  async requireWrite(skill: Skill): Promise<void> {
    const skillId = skill.id;
    const userId = this.requirePrincipal();
    if (skill instanceof PersonalSkill) {
      if (skill.userId !== userId) throw new SkillNotFoundError(skill.id);
      return;
    }
    if (skill instanceof AbstractCollectiveSkill) {
      return this.collectiveAccess.requireWrite(skill);
    }
    if (!(skill instanceof WorkspaceSkill)) {
      throw new SkillNotFoundError(skillId);
    }
    await this.authorizeWorkspace(skill, () =>
      this.workspaceWrite.execute({ workspaceId: skill.workspaceId }),
    );
  }

  /** Creating for a team or the organization takes the right to manage it. */
  async requireCreate(skill: Skill): Promise<void> {
    if (skill instanceof AbstractCollectiveSkill) {
      return this.collectiveAccess.requireManage(skill);
    }
    return this.requireWrite(skill);
  }

  async requireExecution(skill: Skill, threadId: UUID): Promise<void> {
    const skillId = skill.id;
    this.requirePrincipal();
    if (
      skill instanceof PersonalSkill ||
      skill instanceof AbstractCollectiveSkill
    ) {
      await this.requireRead(skill);
      return;
    }
    if (!(skill instanceof WorkspaceSkill)) {
      throw new SkillNotFoundError(skillId);
    }
    await this.authorizeWorkspace(skill, () =>
      this.workspaceExecution.execute({
        workspaceId: skill.workspaceId,
        threadId,
      }),
    );
  }

  private requirePrincipal(): UUID {
    const { userId } = getRequiredUserContext(this.context);
    return userId;
  }

  private async authorizeWorkspace(
    skill: WorkspaceSkill,
    authorize: () => Promise<void>,
  ): Promise<void> {
    try {
      await authorize();
    } catch (error) {
      if (error instanceof WorkspaceNotFoundError) {
        throw new SkillNotFoundError(skill.id);
      }
      throw error;
    }
  }
}
