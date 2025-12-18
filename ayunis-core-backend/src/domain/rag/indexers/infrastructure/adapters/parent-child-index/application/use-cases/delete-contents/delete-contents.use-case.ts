import { Injectable, Logger } from '@nestjs/common';
import { DeleteContentsCommand } from './delete-contents.command';
import { ParentChildIndexerRepository } from '../../../parent-child-index.repository';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedIndexError } from 'src/domain/rag/indexers/application/indexer.errors';

@Injectable()
export class DeleteContentsUseCase {
  private readonly logger = new Logger(DeleteContentsUseCase.name);
  constructor(
    private readonly parentChildIndexerRepository: ParentChildIndexerRepository,
  ) {}

  async execute(command: DeleteContentsCommand): Promise<void> {
    if (command.documentIds.length === 0) {
      return;
    }
    try {
      await this.parentChildIndexerRepository.deleteMany(command.documentIds);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(error);
      throw new UnexpectedIndexError(error as Error);
    }
  }
}
