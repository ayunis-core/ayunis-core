import { Injectable, Logger } from '@nestjs/common';
import { DeleteContentCommand } from './delete-content.command';
import { ParentChildIndexerRepository } from '../../../parent-child-index.repository';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedIndexError } from 'src/domain/rag/indexers/application/indexer.errors';

@Injectable()
export class DeleteContentUseCase {
  private readonly logger = new Logger(DeleteContentUseCase.name);
  constructor(
    private readonly parentChildIndexerRepository: ParentChildIndexerRepository,
  ) {}

  async execute(command: DeleteContentCommand): Promise<void> {
    try {
      await this.parentChildIndexerRepository.delete(command.documentId);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(error);
      throw new UnexpectedIndexError(error as Error);
    }
  }
}
