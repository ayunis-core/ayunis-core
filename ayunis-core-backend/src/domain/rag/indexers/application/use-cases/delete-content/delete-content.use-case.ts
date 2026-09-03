import { Injectable, Logger } from '@nestjs/common';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';
import { DeleteContentCommand } from './delete-content.command';
import { UnexpectedIndexError } from 'src/domain/rag/indexers/application/indexer.errors';

@Injectable()
export class DeleteContentUseCase {
  private readonly logger = new Logger(DeleteContentUseCase.name);

  constructor(private readonly indexRegistry: IndexRegistry) {}

  async execute(command: DeleteContentCommand): Promise<void> {
    try {
      if (command.type) {
        const index = this.indexRegistry.get(command.type);
        return index.delete(command.documentId);
      }
      const indices = this.indexRegistry.getAll();
      for (const index of indices) {
        await index.delete(command.documentId);
      }
    } catch (error) {
      this.logger.error({ err: error as Error }, 'Failed to delete content');
      throw new UnexpectedIndexError(error as Error);
    }
  }
}
