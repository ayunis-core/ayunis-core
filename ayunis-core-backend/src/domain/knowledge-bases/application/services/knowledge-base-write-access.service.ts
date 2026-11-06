import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { AbstractCollectiveKnowledgeBase } from 'src/domain/knowledge-bases/domain/collective-knowledge-base.entity';
import { CollectiveKnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/collective-knowledge-base-access.service';

@Injectable()
export class KnowledgeBaseWriteAccessService {
  constructor(
    private readonly context: ContextService,
    @Inject(forwardRef(() => AssertWorkspaceWriteAccessUseCase))
    private readonly workspaceWriteAccess: AssertWorkspaceWriteAccessUseCase,
    private readonly collectiveAccess: CollectiveKnowledgeBaseAccessService,
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
    const { userId, orgId } = getRequiredUserContext(this.context);
    if (knowledgeBase.orgId !== orgId)
      throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
    if (knowledgeBase instanceof PersonalKnowledgeBase) {
      if (knowledgeBase.userId !== userId)
        throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
      return;
    }
    if (knowledgeBase instanceof AbstractCollectiveKnowledgeBase) {
      await this.collectiveAccess.requireWrite(knowledgeBase);
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
}
