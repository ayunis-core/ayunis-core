import { Injectable, Logger } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  SourceBatchWriteRepository,
  type ReplacedSource,
} from 'src/domain/sources/application/ports/source-batch-write.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { SwapInReplacementSourceCommand } from './swap-in-replacement-source.command';

/**
 * Swaps a settled replacement in for the source it replaces, in one
 * transaction: it takes that source's place in its knowledge base, under
 * its synced location and with its citation URL, and the
 * source is deleted with its index entries. Search finds the old version
 * until the commit and only the new one after it; the document count stays
 * the same. A failed replacement takes the place only of a source without an
 * indexed version, so a version that cannot be processed never hides the
 * last one that could. Returns the deleted source, whose original the caller
 * releases after its commit; `null` when nothing was swapped. For trusted
 * callers (the sync engine).
 */
@Injectable()
export class SwapInReplacementSourceUseCase {
  private readonly logger = new Logger(SwapInReplacementSourceUseCase.name);

  constructor(
    private readonly repository: SourceBatchWriteRepository,
    private readonly deleteSources: DeleteSourcesUseCase,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(
    command: SwapInReplacementSourceCommand,
  ): Promise<ReplacedSource | null> {
    this.logger.log(
      { replacementId: command.replacementId },
      'Swapping in replacement source',
    );
    return this.txHost.withTransaction(async () => {
      const replaced = await this.repository.moveReplacementIn(
        command.replacementId,
        command.name,
      );
      if (!replaced) return null;
      await this.deleteSources.execute(
        new DeleteSourcesCommand([replaced.id], command.orgId),
      );
      return replaced;
    });
  }
}
