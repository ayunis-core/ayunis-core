import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { AssertWorkspaceExecutionAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-execution-access/assert-workspace-execution-access.use-case';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { AbstractCollectiveKnowledgeBase } from 'src/domain/knowledge-bases/domain/collective-knowledge-base.entity';
import { CollectiveKnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/collective-knowledge-base-access.service';

@Injectable()
export class KnowledgeBaseReadAccessService {
  constructor(
    @Inject(forwardRef(() => AssertWorkspaceReadAccessUseCase))
    private readonly workspaceRead: AssertWorkspaceReadAccessUseCase,
    @Inject(forwardRef(() => AssertWorkspaceExecutionAccessUseCase))
    private readonly workspaceExecution: AssertWorkspaceExecutionAccessUseCase,
    private readonly context: ContextService,
    private readonly collectiveAccess: CollectiveKnowledgeBaseAccessService,
  ) {}

  async requireRead(knowledgeBase: KnowledgeBase): Promise<void> {
    const knowledgeBaseId = knowledgeBase.id;
    const userId = this.requirePrincipalInOrganization(knowledgeBase);
    if (knowledgeBase instanceof PersonalKnowledgeBase) {
      this.requireOwner(knowledgeBase, userId);
      return;
    }
    if (knowledgeBase instanceof AbstractCollectiveKnowledgeBase) {
      await this.collectiveAccess.requireRead(knowledgeBase);
      return;
    }
    if (!(knowledgeBase instanceof WorkspaceKnowledgeBase)) {
      throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
    }
    await this.authorizeWorkspace(knowledgeBase, () =>
      this.workspaceRead.execute({ workspaceId: knowledgeBase.workspaceId }),
    );
  }

  async requireExecution(
    knowledgeBase: KnowledgeBase,
    threadId: UUID,
  ): Promise<void> {
    const knowledgeBaseId = knowledgeBase.id;
    const userId = this.requirePrincipalInOrganization(knowledgeBase);
    if (knowledgeBase instanceof PersonalKnowledgeBase) {
      this.requireOwner(knowledgeBase, userId);
      return;
    }
    if (knowledgeBase instanceof AbstractCollectiveKnowledgeBase) {
      await this.collectiveAccess.requireRead(knowledgeBase);
      return;
    }
    if (!(knowledgeBase instanceof WorkspaceKnowledgeBase)) {
      throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
    }
    await this.authorizeWorkspace(knowledgeBase, () =>
      this.workspaceExecution.execute({
        workspaceId: knowledgeBase.workspaceId,
        threadId,
      }),
    );
  }

  private requirePrincipalInOrganization(knowledgeBase: KnowledgeBase): UUID {
    const { userId, orgId } = getRequiredUserContext(this.context);
    if (knowledgeBase.orgId !== orgId) {
      throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
    }
    return userId;
  }

  private requireOwner(
    knowledgeBase: PersonalKnowledgeBase,
    userId: UUID,
  ): void {
    if (knowledgeBase.userId !== userId) {
      throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
    }
  }

  private async authorizeWorkspace(
    knowledgeBase: WorkspaceKnowledgeBase,
    authorize: () => Promise<void>,
  ): Promise<void> {
    try {
      await authorize();
    } catch (error) {
      if (error instanceof WorkspaceNotFoundError) {
        throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
      }
      throw error;
    }
  }
}
