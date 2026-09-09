import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
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
  ) {}

  async requireRead(knowledgeBase: KnowledgeBase): Promise<void> {
    const knowledgeBaseId = knowledgeBase.id;
    const userId = this.requirePrincipalInOrganization(knowledgeBase);
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

  async requireExecution(
    knowledgeBase: KnowledgeBase,
    threadId: UUID,
  ): Promise<void> {
    const knowledgeBaseId = knowledgeBase.id;
    const userId = this.requirePrincipalInOrganization(knowledgeBase);
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

  private requirePrincipalInOrganization(knowledgeBase: KnowledgeBase): UUID {
    const userId = this.context.get('userId');
    const orgId = this.context.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();
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
