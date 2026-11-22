import { Injectable } from '@nestjs/common';
import {
  ConnectorSyncOutcome,
  type ConnectorAccessLost,
  type ConnectorThrottled,
} from 'src/domain/connectors/application/models/connector-sync-results';
import { FetchConnectorItemContentCommand } from 'src/domain/connectors/application/use-cases/fetch-connector-item-content/fetch-connector-item-content.command';
import { FetchConnectorItemContentUseCase } from 'src/domain/connectors/application/use-cases/fetch-connector-item-content/fetch-connector-item-content.use-case';
import { ListConnectorChangesCommand } from 'src/domain/connectors/application/use-cases/list-connector-changes/list-connector-changes.command';
import { ListConnectorChangesUseCase } from 'src/domain/connectors/application/use-cases/list-connector-changes/list-connector-changes.use-case';
import {
  type ConnectorItem,
  ConnectorItemUnprocessableReason,
} from 'src/domain/connectors/domain/sync/connector-item';
import {
  SyncSourceOutcome,
  type SyncAccessLost,
  type SyncChangesResult,
  type SyncItem,
  type SyncItemContentResult,
  type SyncItemSkipReason,
  type SyncThrottled,
} from 'src/domain/knowledge-base-sync/application/models/sync-source-results';
import { SyncSource } from 'src/domain/knowledge-base-sync/application/ports/sync-source.port';
import type { ConnectorSyncedLocation } from 'src/domain/knowledge-base-sync/domain/connector-synced-location.entity';
import { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';

const SKIP_REASONS: Record<
  ConnectorItemUnprocessableReason,
  SyncItemSkipReason
> = {
  [ConnectorItemUnprocessableReason.UNSUPPORTED_TYPE]:
    SyncedFileSkipReason.UNSUPPORTED_TYPE,
  [ConnectorItemUnprocessableReason.TOO_LARGE]: SyncedFileSkipReason.TOO_LARGE,
  [ConnectorItemUnprocessableReason.ENCRYPTED]: SyncedFileSkipReason.ENCRYPTED,
};

/**
 * Every product with a connector, through the organization's own connector
 * (`domain/connectors`).
 */
@Injectable()
export class ConnectorSyncSource extends SyncSource<ConnectorSyncedLocation> {
  constructor(
    private readonly listChangesUseCase: ListConnectorChangesUseCase,
    private readonly fetchContentUseCase: FetchConnectorItemContentUseCase,
  ) {
    super();
  }

  async listChanges(
    location: ConnectorSyncedLocation,
  ): Promise<SyncChangesResult> {
    const changes = await this.listChangesUseCase.execute(
      new ListConnectorChangesCommand({
        connectorId: location.connectorId,
        orgId: location.orgId,
        location: location.location,
        cursor: location.cursor,
      }),
    );
    if (changes.outcome !== ConnectorSyncOutcome.CHANGES)
      return unavailable(changes);
    return {
      outcome: SyncSourceOutcome.CHANGES,
      items: changes.items.map(toSyncItem),
      removedItemIds: changes.removedItemIds,
      cursor: changes.cursor,
      fullListing: changes.fullListing,
    };
  }

  async fetchItemContent(
    location: ConnectorSyncedLocation,
    itemId: string,
  ): Promise<SyncItemContentResult> {
    const content = await this.fetchContentUseCase.execute(
      new FetchConnectorItemContentCommand({
        connectorId: location.connectorId,
        orgId: location.orgId,
        location: location.location,
        itemId,
      }),
    );
    switch (content.outcome) {
      case ConnectorSyncOutcome.CONTENT:
        return {
          outcome: SyncSourceOutcome.CONTENT,
          content: content.content,
          size: content.size,
        };
      case ConnectorSyncOutcome.GONE:
        return { outcome: SyncSourceOutcome.GONE };
      case ConnectorSyncOutcome.UNPROCESSABLE:
        return {
          outcome: SyncSourceOutcome.UNPROCESSABLE,
          reason: SKIP_REASONS[content.reason],
        };
      case ConnectorSyncOutcome.ACCESS_LOST:
      case ConnectorSyncOutcome.THROTTLED:
        return unavailable(content);
    }
  }
}

function unavailable(
  result: ConnectorAccessLost | ConnectorThrottled,
): SyncAccessLost | SyncThrottled {
  return result.outcome === ConnectorSyncOutcome.THROTTLED
    ? { outcome: SyncSourceOutcome.THROTTLED, retryAt: result.retryAt }
    : { outcome: SyncSourceOutcome.ACCESS_LOST };
}

function toSyncItem(item: ConnectorItem): SyncItem {
  return {
    id: item.id,
    path: item.path,
    name: item.name,
    version: item.version,
    size: item.size,
    unprocessableReason:
      item.unprocessableReason && SKIP_REASONS[item.unprocessableReason],
  };
}
