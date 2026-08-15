import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { SourceRepository } from '../../ports/source.repository';
import { DeleteSourcesCommand } from './delete-sources.command';
import { CleanupSourceProcessingUseCase } from '../cleanup-source-processing/cleanup-source-processing.use-case';
import { CleanupSourceProcessingCommand } from '../cleanup-source-processing/cleanup-source-processing.command';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSourceError } from '../../sources.errors';
import { Transactional } from '@nestjs-cls/transactional';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';

@Injectable()
export class DeleteSourcesUseCase {
  constructor(
    @InjectPinoLogger(DeleteSourcesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly indexRegistry: IndexRegistry,
    private readonly sourceRepository: SourceRepository,
    private readonly cleanupSourceProcessingUseCase: CleanupSourceProcessingUseCase,
  ) {}

  @Transactional()
  async execute(command: DeleteSourcesCommand): Promise<void> {
    if (command.sourceIds.length === 0) {
      return;
    }

    this.logger.debug(
      { sourceCount: command.sourceIds.length },
      'Deleting sources',
    );
    try {
      // Cancel jobs and clean MinIO for any processing sources
      await this.cancelProcessingSources(command.sourceIds, command.orgId);

      // Batch delete indexed content from all indices
      const indices = this.indexRegistry.getAll();
      for (const index of indices) {
        await index.deleteMany(command.sourceIds);
      }

      // Batch delete sources
      await this.sourceRepository.deleteMany(command.sourceIds);

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

  private async cancelProcessingSources(
    sourceIds: UUID[],
    orgId: UUID,
  ): Promise<void> {
    const sources = await this.sourceRepository.findByIds(sourceIds);
    const processing = sources.filter(
      (s) => s.status === SourceStatus.PROCESSING,
    );
    if (processing.length > 0) {
      await this.cleanupSourceProcessingUseCase.execute(
        new CleanupSourceProcessingCommand(
          processing.map((source) => source.id),
          orgId,
        ),
      );
    }
  }
}
