import { Injectable, Logger } from '@nestjs/common';
import { SourceRepository } from '../../ports/source.repository';
import { DeleteSourcesCommand } from './delete-sources.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSourceError } from '../../sources.errors';
import { Transactional } from '@nestjs-cls/transactional';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';

@Injectable()
export class DeleteSourcesUseCase {
  private readonly logger = new Logger(DeleteSourcesUseCase.name);

  constructor(
    private readonly indexRegistry: IndexRegistry,
    private readonly sourceRepository: SourceRepository,
  ) {}

  @Transactional()
  async execute(command: DeleteSourcesCommand): Promise<void> {
    if (command.sources.length === 0) {
      return;
    }

    this.logger.debug(`Deleting ${command.sources.length} sources`);
    try {
      const sourceIds = command.sources.map((s) => s.id);

      // Batch delete indexed content from all indices
      const indices = this.indexRegistry.getAll();
      for (const index of indices) {
        await index.deleteMany(sourceIds);
      }

      // Batch delete sources
      await this.sourceRepository.deleteMany(sourceIds);

      this.logger.debug(
        `Successfully deleted ${command.sources.length} sources and their indexed content`,
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error deleting sources', {
        error: error as Error,
      });
      throw new UnexpectedSourceError('Error deleting sources', {
        error: error as Error,
      });
    }
  }
}
