import { Injectable, Logger } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { AssertKnowledgeBaseWriteAccessQuery } from 'src/domain/knowledge-bases/application/use-cases/assert-knowledge-base-write-access/assert-knowledge-base-write-access.query';
import { AssertKnowledgeBaseWriteAccessUseCase } from 'src/domain/knowledge-bases/application/use-cases/assert-knowledge-base-write-access/assert-knowledge-base-write-access.use-case';
import {
  SyncedLocationNotFoundError,
  UnexpectedKnowledgeBaseSyncError,
} from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import { SyncRunsPort } from 'src/domain/knowledge-base-sync/application/ports/sync-runs.port';
import { SyncedFileJobsPort } from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import { SyncedLocationLocks } from 'src/domain/knowledge-base-sync/application/services/synced-location-locks.service';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { RemoveSyncedLocationCommand } from './remove-synced-location.command';

/**
 * Removes a location with its documents and their index entries, and its
 * queued sync with the queued processing of its files. Stays available with connectors switched
 * off, so content can always be removed.
 */
@Injectable()
export class RemoveSyncedLocationUseCase {
  private readonly logger = new Logger(RemoveSyncedLocationUseCase.name);

  constructor(
    private readonly repository: SyncedLocationsRepository,
    private readonly locks: SyncedLocationLocks,
    private readonly writeAccess: AssertKnowledgeBaseWriteAccessUseCase,
    private readonly deleteSources: DeleteSourcesUseCase,
    private readonly jobs: SyncedFileJobsPort,
    private readonly runs: SyncRunsPort,
    private readonly contextService: ContextService,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseSyncError)
  async execute(command: RemoveSyncedLocationCommand): Promise<void> {
    const { orgId } = getRequiredUserContext(this.contextService);
    this.logger.log({ locationId: command.locationId }, 'execute');
    const location = await this.repository.findById(command.locationId);
    if (location?.orgId !== orgId)
      throw new SyncedLocationNotFoundError(command.locationId);
    await this.writeAccess.execute(
      new AssertKnowledgeBaseWriteAccessQuery(location.knowledgeBaseId),
    );
    const files = await this.txHost.withTransaction(async () => {
      // Locked first, so a running sync cannot add documents to it meanwhile.
      const locked = await this.locks.lock(location);
      if (!locked) return [];
      // Their replacements still being processed go with them.
      await this.deleteSources.execute(
        new DeleteSourcesCommand(
          locked.files.flatMap(({ sourceId }) => (sourceId ? [sourceId] : [])),
          orgId,
        ),
      );
      await this.repository.delete(location.id);
      return locked.files;
    });
    await this.runs.remove(location.id);
    await this.jobs.remove(
      files.flatMap(({ sourceId, version }) =>
        sourceId ? [{ sourceId, version }] : [],
      ),
    );
  }
}
