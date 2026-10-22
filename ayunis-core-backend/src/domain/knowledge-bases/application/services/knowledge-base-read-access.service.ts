import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import {
  KnowledgeBaseNotFoundError,
  KnowledgeBaseNotLinkableError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { WorkspaceKnowledgeBaseLinkRepository } from 'src/domain/knowledge-bases/application/ports/workspace-knowledge-base-link.repository';
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
import { IsHandoverReviewerUseCase } from 'src/domain/handovers/application/use-cases/is-handover-reviewer/is-handover-reviewer.use-case';
import { IsHandoverReviewerQuery } from 'src/domain/handovers/application/use-cases/is-handover-reviewer/is-handover-reviewer.query';
import { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { AssertWorkspaceExecutionAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-execution-access/assert-workspace-execution-access.use-case';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class KnowledgeBaseReadAccessService {
  constructor(
    @Inject(forwardRef(() => AssertWorkspaceReadAccessUseCase))
    private readonly workspaceRead: AssertWorkspaceReadAccessUseCase,
    @Inject(forwardRef(() => AssertWorkspaceExecutionAccessUseCase))
    private readonly workspaceExecution: AssertWorkspaceExecutionAccessUseCase,
    private readonly context: ContextService,
    private readonly getViewer: GetOwnershipViewerUseCase,
    @Inject(forwardRef(() => IsHandoverReviewerUseCase))
    private readonly isHandoverReviewer: IsHandoverReviewerUseCase,
    private readonly links: WorkspaceKnowledgeBaseLinkRepository,
  ) {}

  async requireRead(knowledgeBase: KnowledgeBase): Promise<void> {
    const knowledgeBaseId = knowledgeBase.id;
    const userId = this.requirePrincipalInOrganization(knowledgeBase);
    if (isCollectiveKnowledgeBase(knowledgeBase)) {
      const viewer = await this.getViewer.execute();
      const owner = collectiveOwnerOfKnowledgeBase(knowledgeBase);
      if (!viewer.canRead('knowledge_base', owner)) {
        throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
      }
      return;
    }
    if (knowledgeBase instanceof PersonalKnowledgeBase) {
      this.requirePersonalRead(knowledgeBase, userId);
      return;
    }
    if (!(knowledgeBase instanceof WorkspaceKnowledgeBase)) {
      throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
    }
    await this.authorizeWorkspace(knowledgeBase, () =>
      this.workspaceRead.execute({ workspaceId: knowledgeBase.workspaceId }),
    );
  }

  async requireView(knowledgeBase: KnowledgeBase): Promise<void> {
    await this.withLinkFallback(
      knowledgeBase.id,
      () => this.requireReadOrReview(knowledgeBase),
      (workspaceId) => this.workspaceRead.execute({ workspaceId }),
    );
  }

  async requireExecution(
    knowledgeBase: KnowledgeBase,
    threadId: UUID,
  ): Promise<void> {
    this.requirePrincipalInOrganization(knowledgeBase);
    if (knowledgeBase instanceof WorkspaceKnowledgeBase) {
      await this.authorizeWorkspace(knowledgeBase, () =>
        this.workspaceExecution.execute({
          workspaceId: knowledgeBase.workspaceId,
          threadId,
        }),
      );
      return;
    }
    await this.withLinkFallback(
      knowledgeBase.id,
      () => this.requireOwnUse(knowledgeBase),
      (workspaceId) =>
        this.workspaceExecution.execute({ workspaceId, threadId }),
    );
  }

  async requireLinkable(knowledgeBase: KnowledgeBase): Promise<void> {
    this.requirePrincipalInOrganization(knowledgeBase);
    if (knowledgeBase instanceof WorkspaceKnowledgeBase) {
      throw new KnowledgeBaseNotLinkableError(knowledgeBase.id);
    }
    await this.requireOwnUse(knowledgeBase);
  }

  async requireUse(knowledgeBase: CollectiveKnowledgeBase): Promise<void> {
    this.requirePrincipalInOrganization(knowledgeBase);
    const viewer = await this.getViewer.execute();
    const owner = collectiveOwnerOfKnowledgeBase(knowledgeBase);
    if (viewer.canUse(owner)) return;
    if (viewer.canRead('knowledge_base', owner)) {
      throw new UnauthorizedAccessError();
    }
    throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
  }

  private async requireOwnUse(
    knowledgeBase: PersonalKnowledgeBase | CollectiveKnowledgeBase,
  ): Promise<void> {
    if (isCollectiveKnowledgeBase(knowledgeBase)) {
      await this.requireUse(knowledgeBase);
      return;
    }
    const { userId } = getRequiredUserContext(this.context);
    this.requirePersonalRead(knowledgeBase, userId);
  }

  private async requireReadOrReview(
    knowledgeBase: KnowledgeBase,
  ): Promise<void> {
    try {
      await this.requireRead(knowledgeBase);
    } catch (error) {
      if (
        error instanceof KnowledgeBaseNotFoundError &&
        knowledgeBase instanceof PersonalKnowledgeBase &&
        (await this.isHandoverReviewer.execute(
          new IsHandoverReviewerQuery(
            HandoverResourceType.KNOWLEDGE_BASE,
            knowledgeBase.id,
          ),
        ))
      ) {
        return;
      }
      throw error;
    }
  }

  private async withLinkFallback(
    knowledgeBaseId: UUID,
    authorize: () => Promise<void>,
    authorizeWorkspace: (workspaceId: UUID) => Promise<void>,
  ): Promise<void> {
    try {
      await authorize();
    } catch (error) {
      const denied =
        error instanceof KnowledgeBaseNotFoundError ||
        error instanceof UnauthorizedAccessError;
      if (
        !denied ||
        !(await this.isReachableThroughLink(
          knowledgeBaseId,
          authorizeWorkspace,
        ))
      ) {
        throw error;
      }
    }
  }

  private async isReachableThroughLink(
    knowledgeBaseId: UUID,
    authorizeWorkspace: (workspaceId: UUID) => Promise<void>,
  ): Promise<boolean> {
    const links = await this.links.findByKnowledgeBase(knowledgeBaseId);
    for (const { workspaceId } of links) {
      try {
        await authorizeWorkspace(workspaceId);
        return true;
      } catch (error) {
        if (
          !(error instanceof WorkspaceNotFoundError) &&
          !(error instanceof UnauthorizedAccessError)
        ) {
          throw error;
        }
      }
    }
    return false;
  }

  private requirePrincipalInOrganization(knowledgeBase: KnowledgeBase): UUID {
    const { userId, orgId } = getRequiredUserContext(this.context);
    if (knowledgeBase.orgId !== orgId) {
      throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
    }
    return userId;
  }

  private requirePersonalRead(
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
