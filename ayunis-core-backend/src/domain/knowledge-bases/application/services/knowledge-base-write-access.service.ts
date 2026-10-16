import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import type {
  CollectiveKnowledgeBase,
  KnowledgeBase,
} from 'src/domain/knowledge-bases/domain/knowledge-base';
import {
  collectiveOwnerOfKnowledgeBase,
  isCollectiveKnowledgeBase,
} from 'src/domain/knowledge-bases/application/models/collective-knowledge-base-owner';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class KnowledgeBaseWriteAccessService {
  constructor(
    private readonly context: ContextService,
    @Inject(forwardRef(() => AssertWorkspaceWriteAccessUseCase))
    private readonly workspaceWriteAccess: AssertWorkspaceWriteAccessUseCase,
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly hasPermission: HasPermissionUseCase,
  ) {}

  async requireManage(knowledgeBase: KnowledgeBase): Promise<void> {
    await this.requireWrite(knowledgeBase);
    if (isCollectiveKnowledgeBase(knowledgeBase)) return;
    const { orgId, role } = getRequiredUserContext(this.context);
    const allowed = await this.hasPermission.execute(
      new HasPermissionQuery(orgId, role, Permission.MANAGE_OWN_KNOWLEDGE),
    );
    if (!allowed) throw new UnauthorizedAccessError();
  }

  async requireWrite(knowledgeBase: KnowledgeBase): Promise<void> {
    const knowledgeBaseId = knowledgeBase.id;
    const { userId, orgId } = getRequiredUserContext(this.context);
    if (knowledgeBase.orgId !== orgId)
      throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
    if (isCollectiveKnowledgeBase(knowledgeBase)) {
      await this.requireCollectiveManage(knowledgeBase);
      return;
    }
    if (knowledgeBase instanceof PersonalKnowledgeBase) {
      if (knowledgeBase.userId !== userId)
        throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
      return;
    }
    if (knowledgeBase instanceof WorkspaceKnowledgeBase) {
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
      return;
    }
    throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
  }

  private async requireCollectiveManage(
    knowledgeBase: CollectiveKnowledgeBase,
  ): Promise<void> {
    const viewer = await this.getViewer.execute();
    const owner = collectiveOwnerOfKnowledgeBase(knowledgeBase);
    if (viewer.canManage('knowledge_base', owner)) return;
    if (viewer.canRead('knowledge_base', owner)) {
      throw new UnauthorizedAccessError();
    }
    throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
  }
}
