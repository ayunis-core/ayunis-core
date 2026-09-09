import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { KnowledgeBaseContext } from 'src/domain/knowledge-bases/application/models/knowledge-base-context';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { FindKnowledgeBaseQuery } from './find-knowledge-base.query';

@Injectable()
export class FindKnowledgeBaseUseCase {
  private readonly logger = new Logger(FindKnowledgeBaseUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly readAccess: KnowledgeBaseReadAccessService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: FindKnowledgeBaseQuery): Promise<KnowledgeBaseContext> {
    this.logger.log({ id: query.id }, 'Finding knowledge base');
    const knowledgeBase = await this.repository.findById(query.id);
    if (!knowledgeBase) throw new KnowledgeBaseNotFoundError(query.id);
    await this.readAccess.requireRead(knowledgeBase);
    const [isActive, counts] = await Promise.all([
      this.isActive(knowledgeBase),
      this.repository.countSourcesByKnowledgeBaseIds([knowledgeBase.id]),
    ]);
    return {
      knowledgeBase,
      isShared: this.isShared(knowledgeBase),
      isActive,
      documentCount: counts.get(knowledgeBase.id) ?? 0,
    };
  }

  private isShared(knowledgeBase: KnowledgeBase): boolean {
    if (!(knowledgeBase instanceof PersonalKnowledgeBase)) return false;
    const userId = this.context.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    return knowledgeBase.userId !== userId;
  }

  private async isActive(knowledgeBase: KnowledgeBase): Promise<boolean> {
    if (knowledgeBase instanceof PersonalKnowledgeBase) {
      const userId = this.context.get('userId');
      if (!userId) throw new UnauthorizedAccessError();
      return this.repository.isActive(knowledgeBase.id, userId);
    }
    const states = await this.repository.getWorkspaceStates(
      [knowledgeBase.id],
      knowledgeBase.workspaceId,
    );
    return states.get(knowledgeBase.id)?.isActive ?? false;
  }
}
