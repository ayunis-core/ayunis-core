import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DeleteContentCommand } from './delete-content.command';
import { ParentChildIndexerRepository } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/parent-child-index.repository';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedIndexError } from 'src/domain/rag/indexers/application/indexer.errors';

@Injectable()
export class DeleteContentUseCase {
  constructor(
    @InjectPinoLogger(DeleteContentUseCase.name)
    private readonly logger: PinoLogger,
    private readonly parentChildIndexerRepository: ParentChildIndexerRepository,
  ) {}

  async execute(command: DeleteContentCommand): Promise<void> {
    try {
      await this.parentChildIndexerRepository.delete(command.documentId);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error({ err: error as Error }, 'Failed to delete content');
      throw new UnexpectedIndexError(error as Error);
    }
  }
}
