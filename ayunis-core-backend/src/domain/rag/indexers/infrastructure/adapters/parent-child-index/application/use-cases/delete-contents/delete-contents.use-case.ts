import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { DeleteContentsCommand } from './delete-contents.command';
import { ParentChildIndexerRepository } from '../../../parent-child-index.repository';
import { UnexpectedIndexError } from 'src/domain/rag/indexers/application/indexer.errors';

@Injectable()
export class DeleteContentsUseCase {
  private readonly logger = new Logger(DeleteContentsUseCase.name);
  constructor(
    private readonly parentChildIndexerRepository: ParentChildIndexerRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedIndexError)
  async execute(command: DeleteContentsCommand): Promise<void> {
    if (command.documentIds.length === 0) {
      return;
    }
    await this.parentChildIndexerRepository.deleteMany(command.documentIds);
  }
}
