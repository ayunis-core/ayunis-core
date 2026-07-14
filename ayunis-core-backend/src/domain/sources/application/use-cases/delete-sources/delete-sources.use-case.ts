import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SourceRepository } from '../../ports/source.repository';
import { DeleteSourcesCommand } from './delete-sources.command';
import { SourceProcessingCleanupService } from '../../services/source-processing-cleanup.service';
import { SourceStatus } from '../../../domain/source-status.enum';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedSourceError } from '../../sources.errors';
import { Transactional } from '@nestjs-cls/transactional';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';

@Injectable()
export class DeleteSourcesUseCase {
  private readonly logger = new Logger(DeleteSourcesUseCase.name);

  constructor(
    private readonly indexRegistry: IndexRegistry,
    private readonly sourceRepository: SourceRepository,
    private readonly sourceProcessingCleanupService: SourceProcessingCleanupService,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: DeleteSourcesCommand): Promise<void> {
    if (command.sourceIds.length === 0) {
      return;
    }

    this.logger.debug(`Deleting ${command.sourceIds.length} sources`);
    // Cancel jobs and clean MinIO for any processing sources
    await this.cancelProcessingSources(command.sourceIds);

    // Batch delete indexed content from all indices
    const indices = this.indexRegistry.getAll();
    for (const index of indices) {
      await index.deleteMany(command.sourceIds);
    }

    // Batch delete sources
    await this.sourceRepository.deleteMany(command.sourceIds);

    this.logger.debug(
      `Successfully deleted ${command.sourceIds.length} sources and their indexed content`,
    );
  }

  private async cancelProcessingSources(sourceIds: UUID[]): Promise<void> {
    const sources = await this.sourceRepository.findByIds(sourceIds);
    const processing = sources.filter(
      (s) => s.status === SourceStatus.PROCESSING,
    );
    for (const source of processing) {
      await this.sourceProcessingCleanupService.cancelAndCleanup(source.id);
    }
  }
}
