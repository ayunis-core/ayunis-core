import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { DeleteContentCommand } from './delete-content.command';
import { ParentChildIndexerRepository } from '../../../parent-child-index.repository';
import { UnexpectedIndexError } from 'src/domain/rag/indexers/application/indexer.errors';

@Injectable()
export class DeleteContentUseCase {
  private readonly logger = new Logger(DeleteContentUseCase.name);
  constructor(
    private readonly parentChildIndexerRepository: ParentChildIndexerRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedIndexError)
  async execute(command: DeleteContentCommand): Promise<void> {
    await this.parentChildIndexerRepository.delete(command.documentId);
  }
}
