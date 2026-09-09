import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';

@Injectable()
export class KnowledgeBaseWriteAccessService {
  constructor(
    private readonly context: ContextService,
    @Inject(forwardRef(() => AssertWorkspaceWriteAccessUseCase))
    private readonly workspaceWriteAccess: AssertWorkspaceWriteAccessUseCase,
  ) {}

  async requireWrite(knowledgeBase: KnowledgeBase): Promise<void> {
    const knowledgeBaseId = knowledgeBase.id;
    const userId = this.context.get('userId');
    const orgId = this.context.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();
    if (knowledgeBase.orgId !== orgId)
      throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
    if (knowledgeBase instanceof PersonalKnowledgeBase) {
      if (knowledgeBase.userId !== userId)
        throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
      return;
    }
    if (knowledgeBase instanceof WorkspaceKnowledgeBase) {
      await this.workspaceWriteAccess.execute({
        workspaceId: knowledgeBase.workspaceId,
      });
      return;
    }
    throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
  }
}
