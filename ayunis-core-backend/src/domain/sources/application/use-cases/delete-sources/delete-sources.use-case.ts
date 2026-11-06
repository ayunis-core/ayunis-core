import { Injectable, Logger } from '@nestjs/common';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { DeleteSourcesCommand } from './delete-sources.command';
import { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { CleanupSourceProcessingCommand } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.command';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';

@Injectable()
export class DeleteSourcesUseCase {
  private readonly logger = new Logger(DeleteSourcesUseCase.name);

  constructor(
    private readonly indexRegistry: IndexRegistry,
    private readonly sourceRepository: SourceRepository,
    private readonly cleanupSourceProcessingUseCase: CleanupSourceProcessingUseCase,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  async execute(command: DeleteSourcesCommand): Promise<void> {
    if (command.sourceIds.length === 0) {
      return;
    }

    this.logger.debug(
      { sourceCount: command.sourceIds.length },
      'Deleting sources',
    );
    // See DeleteSourceUseCase: inside a caller's transaction the originals
    // are left to the nightly unreferenced-originals sweep.
    const releaseNow = !this.txHost.isTransactionActive();
    try {
      const storageKeys = await this.deleteRecords(command);
      if (releaseNow && storageKeys.length > 0) {
        await this.cleanupSourceProcessingUseCase.execute(
          new CleanupSourceProcessingCommand([], command.orgId, storageKeys),
        );
      }

      this.logger.debug(
        { sourceCount: command.sourceIds.length },
        'Successfully deleted sources and their indexed content',
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
        },
        'Error deleting sources',
      );
      throw new UnexpectedSourceError('Error deleting sources', {
        error: error as Error,
      });
    }
  }

  /** Returns the storage keys of the deleted sources' uploaded originals. */
  @Transactional()
  private async deleteRecords(
    command: DeleteSourcesCommand,
  ): Promise<string[]> {
    const sources = await this.sourceRepository.findByIds(command.sourceIds);
    // Cancel jobs and clean MinIO for any processing sources
    const processing = sources.filter(
      (s) => s.status === SourceStatus.PROCESSING,
    );
    if (processing.length > 0) {
      await this.cleanupSourceProcessingUseCase.execute(
        new CleanupSourceProcessingCommand(
          processing.map((source) => source.id),
          command.orgId,
        ),
      );
    }

    // Batch delete indexed content from all indices
    const indices = this.indexRegistry.getAll();
    for (const index of indices) {
      await index.deleteMany(command.sourceIds);
    }

    // Batch delete sources
    await this.sourceRepository.deleteMany(command.sourceIds);
    return sources.flatMap((source) =>
      source.storageKey === null ? [] : [source.storageKey],
    );
  }
}
