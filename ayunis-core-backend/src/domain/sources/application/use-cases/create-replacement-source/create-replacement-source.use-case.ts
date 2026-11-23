import { Injectable, Logger } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SourceBatchWriteRepository } from 'src/domain/sources/application/ports/source-batch-write.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { fileTypeFromName } from 'src/domain/sources/application/util/source-file-type.helpers';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { CreateReplacementSourceCommand } from './create-replacement-source.command';

/**
 * Creates the hidden replacement of a source whose file changed: a
 * PROCESSING file source outside every knowledge base, so it is neither
 * counted, listed nor searched while the source it replaces stays as it is.
 * It is deleted with that source, and replaces an earlier replacement that
 * was never swapped in. `null` once the source is gone. For trusted callers
 * (the sync engine).
 */
@Injectable()
export class CreateReplacementSourceUseCase {
  private readonly logger = new Logger(CreateReplacementSourceUseCase.name);

  constructor(
    private readonly repository: SourceBatchWriteRepository,
    private readonly deleteSources: DeleteSourcesUseCase,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(
    command: CreateReplacementSourceCommand,
  ): Promise<FileSource | null> {
    this.logger.log(
      { replacedSourceId: command.replacedSourceId },
      'Creating replacement source',
    );
    const replacement = new FileSource({
      id: command.id,
      name: command.name,
      fileType: fileTypeFromName(command.fileName ?? command.name),
      type: TextType.FILE,
      status: SourceStatus.PROCESSING,
      processingStartedAt: null,
      storageKey: command.storageKey,
    });
    return this.txHost.withTransaction(async () => {
      const replaced = (
        await this.repository.lock([command.replacedSourceId])
      ).at(0);
      if (!replaced) return null;
      await this.deleteSources.execute(
        new DeleteSourcesCommand(
          await this.repository.findReplacementIds(replaced),
          command.orgId,
        ),
      );
      await this.repository.insertReplacement(replacement, replaced);
      return replacement;
    });
  }
}
