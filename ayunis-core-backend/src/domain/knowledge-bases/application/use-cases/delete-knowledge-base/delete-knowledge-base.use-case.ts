import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import { runDeferredCleanup } from 'src/common/events/run-deferred-cleanup';
import { CleanupSourceProcessingCommand } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.command';
import { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { GetSourcesByKnowledgeBaseIdQuery } from 'src/domain/sources/application/use-cases/get-sources-by-knowledge-base-id/get-sources-by-knowledge-base-id.query';
import { GetSourcesByKnowledgeBaseIdUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-knowledge-base-id/get-sources-by-knowledge-base-id.use-case';
import { DeleteKnowledgeBaseCommand } from './delete-knowledge-base.command';

interface SourceCleanupSnapshot {
  sourceIds: UUID[];
  orgId: UUID;
}

@Injectable()
export class DeleteKnowledgeBaseUseCase {
  private readonly logger = new Logger(DeleteKnowledgeBaseUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly writeAccess: KnowledgeBaseWriteAccessService,
    private readonly getSources: GetSourcesByKnowledgeBaseIdUseCase,
    private readonly cleanupProcessing: CleanupSourceProcessingUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(command: DeleteKnowledgeBaseCommand): Promise<void> {
    this.logger.log(
      { knowledgeBaseId: command.knowledgeBaseId },
      'Deleting knowledge base',
    );
    const cleanupSnapshot = await this.deleteRecords(command);
    const cleanupCommand = new CleanupSourceProcessingCommand(
      cleanupSnapshot.sourceIds,
      cleanupSnapshot.orgId,
    );
    await runDeferredCleanup(
      [
        {
          label: 'cleanup knowledge base source processing',
          run: () => this.cleanupProcessing.execute(cleanupCommand),
        },
      ],
      this.logger,
    );
  }

  @Transactional()
  private async deleteRecords(
    command: DeleteKnowledgeBaseCommand,
  ): Promise<SourceCleanupSnapshot> {
    const existing = await this.repository.findById(command.knowledgeBaseId);
    if (!existing) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }
    await this.writeAccess.requireWrite(existing);

    const sources = await this.getSources.execute(
      new GetSourcesByKnowledgeBaseIdQuery(existing.id),
    );
    // FK cascades delete sources and index chunks atomically. Queue/storage
    // cleanup must wait until commit: remote I/O can outlive the DB session.
    await this.repository.delete(existing);
    return {
      sourceIds: sources.map(({ id }) => id),
      orgId: existing.orgId,
    };
  }
}
