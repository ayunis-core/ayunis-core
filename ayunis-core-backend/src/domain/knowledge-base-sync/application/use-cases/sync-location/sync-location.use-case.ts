import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FeatureFlag } from 'src/config/features.config';
import {
  ConnectorSyncOutcome,
  type ConnectorChanges,
} from 'src/domain/connectors/application/models/connector-sync-results';
import { ListConnectorChangesCommand } from 'src/domain/connectors/application/use-cases/list-connector-changes/list-connector-changes.command';
import { ListConnectorChangesUseCase } from 'src/domain/connectors/application/use-cases/list-connector-changes/list-connector-changes.use-case';
import {
  ConnectorItemUnprocessableReason,
  type ConnectorItem,
} from 'src/domain/connectors/domain/sync/connector-item';
import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import {
  SyncedLocationNotFoundError,
  UnexpectedKnowledgeBaseSyncError,
} from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import { SyncedFileJobsPort } from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import {
  SyncPlanApplier,
  type AppliedSync,
} from 'src/domain/knowledge-base-sync/application/services/sync-plan-applier.service';
import type { SyncedFile } from 'src/domain/knowledge-base-sync/domain/synced-file.entity';
import type { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';
import { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';
import { SyncedFileState } from 'src/domain/knowledge-base-sync/domain/synced-file-state.enum';
import { CheckSourceFileAcceptanceQuery } from 'src/domain/sources/application/use-cases/check-source-file-acceptance/check-source-file-acceptance.query';
import { CheckSourceFileAcceptanceUseCase } from 'src/domain/sources/application/use-cases/check-source-file-acceptance/check-source-file-acceptance.use-case';
import { SourceFileRejection } from 'src/domain/sources/application/models/source-file-rejection';
import { SyncLocationCommand } from './sync-location.command';
import {
  SyncLocationOutcome,
  type SyncLocationResult,
  type SyncSummary,
} from './sync-location.result';

/**
 * One sync run of a location: the connector's changes since the cursor are
 * reconciled with the location's files and documents. Runs without a user;
 * scheduling it is AYC-1885, processing the queued files AYC-1950.
 */
@Injectable()
export class SyncLocationUseCase {
  private readonly logger = new Logger(SyncLocationUseCase.name);

  constructor(
    private readonly repository: SyncedLocationsRepository,
    private readonly listChanges: ListConnectorChangesUseCase,
    private readonly checkAcceptance: CheckSourceFileAcceptanceUseCase,
    private readonly applier: SyncPlanApplier,
    private readonly jobs: SyncedFileJobsPort,
    private readonly configService: ConfigService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseSyncError)
  async execute(command: SyncLocationCommand): Promise<SyncLocationResult> {
    this.logger.log({ locationId: command.locationId }, 'execute');
    if (!this.configService.get<boolean>(`features.${FeatureFlag.Connectors}`))
      return { outcome: SyncLocationOutcome.DISABLED };
    const location = await this.repository.findById(command.locationId);
    if (!location) throw new SyncedLocationNotFoundError(command.locationId);

    const changes = await this.listChanges.execute(
      new ListConnectorChangesCommand({
        connectorId: location.connectorId,
        orgId: location.orgId,
        location: location.location,
        cursor: location.cursor,
      }),
    );
    switch (changes.outcome) {
      case ConnectorSyncOutcome.ACCESS_LOST:
        await this.repository.markNoLongerAccessible(
          location.id,
          location.lastSyncedAt,
        );
        return { outcome: SyncLocationOutcome.ACCESS_LOST };
      case ConnectorSyncOutcome.THROTTLED:
        return {
          outcome: SyncLocationOutcome.THROTTLED,
          retryAt: changes.retryAt,
        };
      case ConnectorSyncOutcome.CHANGES:
        return this.reconcile(location, changes);
    }
  }

  private async reconcile(
    location: SyncedLocation,
    changes: ConnectorChanges,
  ): Promise<SyncLocationResult> {
    const rejections = await this.rejections(changes.items);
    const applied = await this.applier.apply(location, changes, rejections);
    if (!applied) return { outcome: SyncLocationOutcome.SUPERSEDED };
    await this.enqueue(location, applied.plan.files);
    const summary = this.summarize(applied);
    this.logger.log({ locationId: location.id, ...summary }, 'Synced');
    return { outcome: SyncLocationOutcome.SYNCED, summary };
  }

  private async rejections(
    items: ConnectorItem[],
  ): Promise<Map<string, SyncedFileSkipReason>> {
    const rejections = new Map<string, SyncedFileSkipReason>();
    for (const item of items) {
      const reason = item.unprocessableReason
        ? CONNECTOR_SKIP_REASONS[item.unprocessableReason]
        : await this.uploadRejection(item);
      if (reason) rejections.set(item.id, reason);
    }
    return rejections;
  }

  /** Synced files are held to the limits of uploads to a knowledge base. */
  private async uploadRejection(
    item: ConnectorItem,
  ): Promise<SyncedFileSkipReason | null> {
    const rejection = await this.checkAcceptance.execute(
      new CheckSourceFileAcceptanceQuery({
        fileName: item.name,
        size: item.size,
        maxFileSizeBytes: KnowledgeBasesConstants.MAX_FILE_SIZE_BYTES,
      }),
    );
    return rejection ? UPLOAD_SKIP_REASONS[rejection] : null;
  }

  /**
   * After the commit, so a worker never sees a file before its document.
   * Every document not yet processed at its file's version is queued on
   * every sync, which queues nothing twice but recovers jobs a failed or
   * interrupted enqueue lost.
   */
  private async enqueue(
    location: SyncedLocation,
    files: SyncedFile[],
  ): Promise<void> {
    await this.jobs.enqueue(
      location.orgId,
      files.flatMap((file) =>
        file.sourceId && file.needsProcessing()
          ? [
              {
                orgId: location.orgId,
                knowledgeBaseId: location.knowledgeBaseId,
                locationId: location.id,
                syncedFileId: file.id,
                sourceId: file.sourceId,
                version: file.version,
              },
            ]
          : [],
      ),
    );
  }

  private summarize({ plan, createdSourceIds }: AppliedSync): SyncSummary {
    const count = (state: SyncedFileState) =>
      plan.files.filter((file) => file.state === state).length;
    return {
      added: createdSourceIds.length,
      removed: plan.removed.length,
      relabelled: plan.relabelled,
      contentChanged: plan.contentChanged.length,
      skipped: count(SyncedFileState.SKIPPED),
      notSyncedLimitReached: count(SyncedFileState.AWAITING_CAPACITY),
    };
  }
}

const CONNECTOR_SKIP_REASONS: Record<
  ConnectorItemUnprocessableReason,
  SyncedFileSkipReason
> = {
  [ConnectorItemUnprocessableReason.UNSUPPORTED_TYPE]:
    SyncedFileSkipReason.UNSUPPORTED_TYPE,
  [ConnectorItemUnprocessableReason.TOO_LARGE]: SyncedFileSkipReason.TOO_LARGE,
  [ConnectorItemUnprocessableReason.ENCRYPTED]: SyncedFileSkipReason.ENCRYPTED,
};

const UPLOAD_SKIP_REASONS: Record<SourceFileRejection, SyncedFileSkipReason> = {
  [SourceFileRejection.UNSUPPORTED_TYPE]: SyncedFileSkipReason.UNSUPPORTED_TYPE,
  [SourceFileRejection.TOO_LARGE]: SyncedFileSkipReason.TOO_LARGE,
};
