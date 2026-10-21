import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
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
import { FindShareByEntityQuery } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.query';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { CheckKnowledgeBaseSkillShareAccessQuery } from 'src/domain/skills/application/use-cases/check-knowledge-base-skill-share-access/check-knowledge-base-skill-share-access.query';
import { CheckKnowledgeBaseSkillShareAccessUseCase } from 'src/domain/skills/application/use-cases/check-knowledge-base-skill-share-access/check-knowledge-base-skill-share-access.use-case';
import { AssertWorkspaceExecutionAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-execution-access/assert-workspace-execution-access.use-case';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class KnowledgeBaseReadAccessService {
  constructor(
    private readonly findShare: FindShareByEntityUseCase,
    private readonly checkSkillShareAccess: CheckKnowledgeBaseSkillShareAccessUseCase,
    @Inject(forwardRef(() => AssertWorkspaceReadAccessUseCase))
    private readonly workspaceRead: AssertWorkspaceReadAccessUseCase,
    @Inject(forwardRef(() => AssertWorkspaceExecutionAccessUseCase))
    private readonly workspaceExecution: AssertWorkspaceExecutionAccessUseCase,
    private readonly context: ContextService,
    private readonly getViewer: GetOwnershipViewerUseCase,
    @Inject(forwardRef(() => IsHandoverReviewerUseCase))
    private readonly isHandoverReviewer: IsHandoverReviewerUseCase,
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
      await this.requirePersonalRead(knowledgeBase, userId);
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

  async requireExecution(
    knowledgeBase: KnowledgeBase,
    threadId: UUID,
  ): Promise<void> {
    const knowledgeBaseId = knowledgeBase.id;
    const userId = this.requirePrincipalInOrganization(knowledgeBase);
    if (isCollectiveKnowledgeBase(knowledgeBase)) {
      await this.requireUse(knowledgeBase);
      return;
    }
    if (knowledgeBase instanceof PersonalKnowledgeBase) {
      await this.requirePersonalRead(knowledgeBase, userId);
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

  private requirePrincipalInOrganization(knowledgeBase: KnowledgeBase): UUID {
    const { userId, orgId } = getRequiredUserContext(this.context);
    if (knowledgeBase.orgId !== orgId) {
      throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
    }
    return userId;
  }

  private async requirePersonalRead(
    knowledgeBase: PersonalKnowledgeBase,
    userId: UUID,
  ): Promise<void> {
    if (knowledgeBase.userId === userId) return;
    const directShare = await this.findShare.execute(
      new FindShareByEntityQuery(
        SharedEntityType.KNOWLEDGE_BASE,
        knowledgeBase.id,
      ),
    );
    if (directShare) return;
    const hasSkillShare = await this.checkSkillShareAccess.execute(
      new CheckKnowledgeBaseSkillShareAccessQuery(
        knowledgeBase.id,
        knowledgeBase.userId,
      ),
    );
    if (!hasSkillShare) throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
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
