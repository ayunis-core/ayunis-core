import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SourceBatchWriteRepository } from 'src/domain/sources/application/ports/source-batch-write.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { RenameSourcesCommand } from './rename-sources.command';

/** Renames sources without touching their content or index entries. */
@Injectable()
export class RenameSourcesUseCase {
  private readonly logger = new Logger(RenameSourcesUseCase.name);

  constructor(private readonly repository: SourceBatchWriteRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: RenameSourcesCommand): Promise<void> {
    this.logger.log({ count: command.renames.length }, 'Renaming sources');
    await this.repository.rename(command.renames);
  }
}
