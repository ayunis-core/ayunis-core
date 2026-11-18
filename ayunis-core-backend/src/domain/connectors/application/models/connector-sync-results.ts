import type { Readable } from 'stream';
import type { ConnectorItem } from 'src/domain/connectors/domain/sync/connector-item';

export enum ConnectorSyncOutcome {
  CHANGES = 'changes',
  CONTENT = 'content',
  /** The grant was revoked, or the connector is gone or no longer set up. */
  ACCESS_LOST = 'access_lost',
  THROTTLED = 'throttled',
  /** The item no longer exists. */
  GONE = 'gone',
}

export interface ConnectorAccessLost {
  outcome: ConnectorSyncOutcome.ACCESS_LOST;
}

export interface ConnectorThrottled {
  outcome: ConnectorSyncOutcome.THROTTLED;
  retryAt: Date;
}

export interface ConnectorChanges {
  outcome: ConnectorSyncOutcome.CHANGES;
  /** Added and changed items, including renamed and moved ones. */
  items: ConnectorItem[];
  /**
   * Files deleted or moved out of the location, including those of a folder
   * that was; may include IDs never listed.
   */
  removedItemIds: string[];
  /** Opaque; passed back on the next call. */
  cursor: string;
  /**
   * The items are everything below the location, e.g. after the provider
   * demanded a resync: whatever is not listed is gone.
   */
  fullListing: boolean;
}

export interface ConnectorItemContent {
  outcome: ConnectorSyncOutcome.CONTENT;
  content: Readable;
  size: number;
}

export interface ConnectorItemGone {
  outcome: ConnectorSyncOutcome.GONE;
}

export type ConnectorChangesResult =
  ConnectorChanges | ConnectorAccessLost | ConnectorThrottled;

export type ConnectorItemContentResult =
  | ConnectorItemContent
  | ConnectorItemGone
  | ConnectorAccessLost
  | ConnectorThrottled;
