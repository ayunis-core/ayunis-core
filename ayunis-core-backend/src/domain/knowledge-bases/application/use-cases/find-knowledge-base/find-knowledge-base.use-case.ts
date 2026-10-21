import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { KnowledgeBaseContext } from 'src/domain/knowledge-bases/application/models/knowledge-base-context';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { isCollectiveKnowledgeBase } from 'src/domain/knowledge-bases/application/models/collective-knowledge-base-owner';
import { KnowledgeBaseOwnershipContextService } from 'src/domain/knowledge-bases/application/services/knowledge-base-ownership-context.service';
import { FindKnowledgeBaseQuery } from './find-knowledge-base.query';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class FindKnowledgeBaseUseCase {
  private readonly logger = new Logger(FindKnowledgeBaseUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly readAccess: KnowledgeBaseReadAccessService,
    private readonly context: ContextService,
    private readonly ownershipContext: KnowledgeBaseOwnershipContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: FindKnowledgeBaseQuery): Promise<KnowledgeBaseContext> {
    this.logger.log({ id: query.id }, 'Finding knowledge base');
    const knowledgeBase = await this.repository.findById(query.id);
    if (!knowledgeBase) throw new KnowledgeBaseNotFoundError(query.id);
    await this.readAccess.requireView(knowledgeBase);
    if (knowledgeBase instanceof WorkspaceKnowledgeBase) {
      return this.workspaceContext(knowledgeBase);
    }
    const [ownership, counts] = await Promise.all([
      this.ownershipContext.lookup([knowledgeBase]),
      this.repository.countSourcesByKnowledgeBaseIds([knowledgeBase.id]),
    ]);
    return {
      knowledgeBase,
      isShared: this.isShared(knowledgeBase),
      isActive: isCollectiveKnowledgeBase(knowledgeBase)
        ? ownership.isActive(knowledgeBase)
        : await this.repository.isActive(
            knowledgeBase.id,
            ownership.viewer.userId,
          ),
      documentCount: counts.get(knowledgeBase.id) ?? 0,
      viewer: ownership.rightsFor(knowledgeBase),
      ownerDescription: ownership.describe(knowledgeBase),
    };
  }

  private async workspaceContext(
    knowledgeBase: WorkspaceKnowledgeBase,
  ): Promise<KnowledgeBaseContext> {
    const [states, counts] = await Promise.all([
      this.repository.getWorkspaceStates(
        [knowledgeBase.id],
        knowledgeBase.workspaceId,
      ),
      this.repository.countSourcesByKnowledgeBaseIds([knowledgeBase.id]),
    ]);
    return {
      knowledgeBase,
      isShared: false,
      isActive: states.get(knowledgeBase.id)?.isActive ?? false,
      documentCount: counts.get(knowledgeBase.id) ?? 0,
    };
  }

  private isShared(knowledgeBase: KnowledgeBase): boolean {
    if (!(knowledgeBase instanceof PersonalKnowledgeBase)) return false;
    const { userId } = getRequiredUserContext(this.context);
    return knowledgeBase.userId !== userId;
  }
}
