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
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import {
  SyncPlanApplier,
  type AppliedSync,
} from 'src/domain/knowledge-base-sync/application/services/sync-plan-applier.service';
import type { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';
import { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';
import { SyncedFileState } from 'src/domain/knowledge-base-sync/domain/synced-file-state.enum';
import { throttlePauseEnd } from 'src/domain/knowledge-base-sync/domain/sync-schedule';
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
 * The listing of a location's sync: the connector's changes since the cursor
 * are reconciled with the location's files and documents, and the location
 * is marked as syncing. Runs without a user, in a run of the sync queue that
 * then feeds the files to processing (`NextSyncedFileBatchUseCase`).
 */
@Injectable()
export class SyncLocationUseCase {
  private readonly logger = new Logger(SyncLocationUseCase.name);

  constructor(
    private readonly repository: SyncedLocationsRepository,
    private readonly listChanges: ListConnectorChangesUseCase,
    private readonly checkAcceptance: CheckSourceFileAcceptanceUseCase,
    private readonly applier: SyncPlanApplier,
    private readonly configService: ConfigService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseSyncError)
  async execute(command: SyncLocationCommand): Promise<SyncLocationResult> {
    this.logger.log({ locationId: command.locationId }, 'execute');
    if (!this.configService.get<boolean>(`features.${FeatureFlag.Connectors}`))
      return { outcome: SyncLocationOutcome.DISABLED };
    const location = await this.repository.findById(command.locationId);
    if (!location) throw new SyncedLocationNotFoundError(command.locationId);
    const now = new Date();
    const pausedUntil = location.pausedAt(now);
    if (pausedUntil)
      return { outcome: SyncLocationOutcome.PAUSED, retryAt: pausedUntil };
    await this.repository.recordSyncStarted(location.id, now);

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
      case ConnectorSyncOutcome.THROTTLED: {
        const retryAt = throttlePauseEnd(changes.retryAt, new Date());
        await this.repository.pause(location.id, retryAt);
        return { outcome: SyncLocationOutcome.THROTTLED, retryAt };
      }
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
    const summary = this.summarize(applied);
    this.logger.log({ locationId: location.id, ...summary }, 'Synced');
    return { outcome: SyncLocationOutcome.SYNCED, summary };
  }

  private async rejections(
    items: ConnectorItem[],
  ): Promise<Map<string, SyncedFileSkipReason>> {
    const rejections = new Map<string, SyncedFileSkipReason>();
    // A provider may list an item twice in one round; the last one counts.
    const listed = new Map(items.map((item) => [item.id, item]));
    for (const item of listed.values()) {
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
