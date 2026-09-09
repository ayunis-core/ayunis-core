import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { FindShareByEntityQuery } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.query';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { AssertWorkspaceExecutionAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-execution-access/assert-workspace-execution-access.use-case';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';

@Injectable()
export class SkillAuthorizationService {
  constructor(
    private readonly findShare: FindShareByEntityUseCase,
    @Inject(forwardRef(() => AssertWorkspaceReadAccessUseCase))
    private readonly workspaceRead: AssertWorkspaceReadAccessUseCase,
    @Inject(forwardRef(() => AssertWorkspaceWriteAccessUseCase))
    private readonly workspaceWrite: AssertWorkspaceWriteAccessUseCase,
    @Inject(forwardRef(() => AssertWorkspaceExecutionAccessUseCase))
    private readonly workspaceExecution: AssertWorkspaceExecutionAccessUseCase,
    private readonly context: ContextService,
  ) {}

  async requireRead(skill: Skill): Promise<void> {
    const skillId = skill.id;
    const userId = this.requirePrincipal();
    if (skill instanceof PersonalSkill) {
      if (skill.userId === userId) return;
      const share = await this.findShare.execute(
        new FindShareByEntityQuery(SharedEntityType.SKILL, skill.id),
      );
      if (share) return;
      throw new SkillNotFoundError(skill.id);
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
    if (!(skill instanceof WorkspaceSkill)) {
      throw new SkillNotFoundError(skillId);
    }
    await this.authorizeWorkspace(skill, () =>
      this.workspaceWrite.execute({ workspaceId: skill.workspaceId }),
    );
  }

  async requireExecution(skill: Skill, threadId: UUID): Promise<void> {
    const skillId = skill.id;
    this.requirePrincipal();
    if (skill instanceof PersonalSkill) {
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
    const userId = this.context.get('userId');
    const orgId = this.context.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();
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
