import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DeleteContentsCommand } from './delete-contents.command';
import { ParentChildIndexerRepository } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/parent-child-index.repository';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedIndexError } from 'src/domain/rag/indexers/application/indexer.errors';

@Injectable()
export class DeleteContentsUseCase {
  constructor(
    @InjectPinoLogger(DeleteContentsUseCase.name)
    private readonly logger: PinoLogger,
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
      this.logger.error({ err: error as Error }, 'Failed to delete contents');
      throw new UnexpectedIndexError(error as Error);
    }
  }
}
