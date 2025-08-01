import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  SourceRepository,
  SOURCE_REPOSITORY,
} from '../../ports/source.repository';
import { DeleteSourceCommand } from './delete-source.command';
import { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import { DeleteContentCommand } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.command';

@Injectable()
export class DeleteSourceUseCase {
  private readonly logger = new Logger(DeleteSourceUseCase.name);

  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sourceRepository: SourceRepository,
    private readonly deleteContentUseCase: DeleteContentUseCase,
  ) {}

  async execute(command: DeleteSourceCommand): Promise<void> {
    this.logger.debug(`Deleting source: ${command.id}`);

    // Delete indexed content first
    const deleteContentCommand = new DeleteContentCommand({
      documentId: command.id,
    });

    await this.deleteContentUseCase.execute(deleteContentCommand);

    // Then delete the source from the database
    await this.sourceRepository.delete(command.id);

    this.logger.debug(
      `Successfully deleted source and indexed content: ${command.id}`,
    );
  }
}
