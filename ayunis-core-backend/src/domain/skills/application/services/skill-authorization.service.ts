import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { FindShareByEntityQuery } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.query';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { CollectiveSkill, Skill } from 'src/domain/skills/domain/skill';
import {
  collectiveOwnerOf,
  isCollectiveSkill,
} from 'src/domain/skills/application/models/collective-skill-owner';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { AssertWorkspaceExecutionAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-execution-access/assert-workspace-execution-access.use-case';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { getRequiredUserContext } from 'src/common/context/required-context';

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
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly hasPermission: HasPermissionUseCase,
  ) {}

  async requireRead(skill: Skill): Promise<void> {
    const skillId = skill.id;
    const userId = this.requirePrincipal();
    if (isCollectiveSkill(skill)) {
      const viewer = await this.getViewer.execute();
      if (!viewer.canRead('skill', collectiveOwnerOf(skill))) {
        throw new SkillNotFoundError(skillId);
      }
      return;
    }
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
    if (isCollectiveSkill(skill)) {
      await this.requireCollectiveManage(skill);
      return;
    }
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

  async requireManage(skill: Skill): Promise<void> {
    await this.requireWrite(skill);
    if (isCollectiveSkill(skill)) return;
    const { orgId, role } = getRequiredUserContext(this.context);
    const allowed = await this.hasPermission.execute(
      new HasPermissionQuery(orgId, role, Permission.MANAGE_OWN_SKILLS),
    );
    if (!allowed) throw new UnauthorizedAccessError();
  }

  async requireUse(skill: CollectiveSkill): Promise<void> {
    const viewer = await this.getViewer.execute();
    const owner = collectiveOwnerOf(skill);
    if (viewer.canUse(owner)) return;
    if (viewer.canRead('skill', owner)) throw new UnauthorizedAccessError();
    throw new SkillNotFoundError(skill.id);
  }

  async requireExecution(skill: Skill, threadId: UUID): Promise<void> {
    const skillId = skill.id;
    this.requirePrincipal();
    if (isCollectiveSkill(skill)) {
      await this.requireUse(skill);
      return;
    }
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

  private async requireCollectiveManage(skill: CollectiveSkill): Promise<void> {
    const viewer = await this.getViewer.execute();
    const owner = collectiveOwnerOf(skill);
    if (viewer.canManage('skill', owner)) return;
    if (viewer.canRead('skill', owner)) throw new UnauthorizedAccessError();
    throw new SkillNotFoundError(skill.id);
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
