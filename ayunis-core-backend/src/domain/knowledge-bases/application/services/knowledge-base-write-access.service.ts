import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import {
  getRequiredUserContext,
  type UserContext,
} from 'src/common/context/required-context';
import { AbstractCollectiveKnowledgeBase } from 'src/domain/knowledge-bases/domain/collective-knowledge-base.entity';
import { CollectiveKnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/collective-knowledge-base-access.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

/**
 * Writing takes the permission of the owner: `manage_knowledge_bases` for
 * personal knowledge bases, the team or org permissions for collective ones,
 * and `manage_workspace` in the workspace for workspace knowledge bases. The
 * knowledge-base routes therefore do not gate on `manage_knowledge_bases`
 * themselves.
 */
@Injectable()
export class KnowledgeBaseWriteAccessService {
  constructor(
    private readonly context: ContextService,
    @Inject(forwardRef(() => AssertWorkspaceWriteAccessUseCase))
    private readonly workspaceWriteAccess: AssertWorkspaceWriteAccessUseCase,
    private readonly collectiveAccess: CollectiveKnowledgeBaseAccessService,
    private readonly hasPermission: HasPermissionUseCase,
  ) {}

  /** Creating for a team or the organization takes the right to manage it. */
  async requireCreate(knowledgeBase: KnowledgeBase): Promise<void> {
    if (knowledgeBase instanceof AbstractCollectiveKnowledgeBase) {
      return this.collectiveAccess.requireManage(knowledgeBase);
    }
    return this.requireWrite(knowledgeBase);
  }

  async requireWrite(knowledgeBase: KnowledgeBase): Promise<void> {
    const knowledgeBaseId = knowledgeBase.id;
    const user = getRequiredUserContext(this.context);
    if (knowledgeBase.orgId !== user.orgId)
      throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
    if (knowledgeBase instanceof PersonalKnowledgeBase) {
      return this.requirePersonalWrite(knowledgeBase, user);
    }
    if (knowledgeBase instanceof AbstractCollectiveKnowledgeBase) {
      return this.collectiveAccess.requireWrite(knowledgeBase);
    }
    if (knowledgeBase instanceof WorkspaceKnowledgeBase) {
      return this.requireWorkspaceWrite(knowledgeBase);
    }
    throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
  }

  private async requirePersonalWrite(
    knowledgeBase: PersonalKnowledgeBase,
    user: UserContext,
  ): Promise<void> {
    if (knowledgeBase.userId !== user.userId)
      throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
    const allowed = await this.hasPermission.execute(
      new HasPermissionQuery(
        user.orgId,
        user.role,
        Permission.MANAGE_KNOWLEDGE_BASES,
      ),
    );
    if (!allowed) throw new UnauthorizedAccessError();
  }

  private async requireWorkspaceWrite(
    knowledgeBase: WorkspaceKnowledgeBase,
  ): Promise<void> {
    try {
      await this.workspaceWriteAccess.execute({
        workspaceId: knowledgeBase.workspaceId,
      });
    } catch (error) {
      if (error instanceof WorkspaceNotFoundError) {
        throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
      }
      throw error;
    }
  }
}
