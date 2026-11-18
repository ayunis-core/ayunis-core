import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import { DeleteFailedKnowledgeBaseSourcesCommand } from 'src/domain/sources/application/use-cases/delete-failed-knowledge-base-sources/delete-failed-knowledge-base-sources.command';
import { DeleteFailedKnowledgeBaseSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-failed-knowledge-base-sources/delete-failed-knowledge-base-sources.use-case';
import { RemoveFailedDocumentsFromKnowledgeBaseCommand } from './remove-failed-documents-from-knowledge-base.command';

@Injectable()
export class RemoveFailedDocumentsFromKnowledgeBaseUseCase {
  private readonly logger = new Logger(
    RemoveFailedDocumentsFromKnowledgeBaseUseCase.name,
  );

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly writeAccess: KnowledgeBaseWriteAccessService,
    private readonly deleteFailedSources: DeleteFailedKnowledgeBaseSourcesUseCase,
  ) {}

  /** Returns the ids of the removed documents. */
  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    command: RemoveFailedDocumentsFromKnowledgeBaseCommand,
  ): Promise<UUID[]> {
    this.logger.log(
      { knowledgeBaseId: command.knowledgeBaseId },
      'Removing failed documents from knowledge base',
    );
    const knowledgeBase = await this.repository.findById(
      command.knowledgeBaseId,
    );
    if (!knowledgeBase) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }
    await this.writeAccess.requireWrite(knowledgeBase);

    const removedIds = await this.deleteFailedSources.execute(
      new DeleteFailedKnowledgeBaseSourcesCommand(
        knowledgeBase.id,
        knowledgeBase.orgId,
      ),
    );
    this.logger.log(
      { knowledgeBaseId: knowledgeBase.id, removedCount: removedIds.length },
      'Removed failed documents from knowledge base',
    );
    return removedIds;
  }
}
