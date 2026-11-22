import type { Readable } from 'stream';
import type { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';

export enum SyncSourceOutcome {
  CHANGES = 'changes',
  CONTENT = 'content',
  /** The source no longer grants access to the location. */
  ACCESS_LOST = 'access_lost',
  THROTTLED = 'throttled',
  /** The item no longer exists. */
  GONE = 'gone',
  /** Reading the item showed that it cannot be processed. */
  UNPROCESSABLE = 'unprocessable',
}

/** Why a source already knows an item cannot be processed. */
export type SyncItemSkipReason =
  | SyncedFileSkipReason.UNSUPPORTED_TYPE
  | SyncedFileSkipReason.TOO_LARGE
  | SyncedFileSkipReason.ENCRYPTED;

/** A file below a synced location, as its source lists it. */
export interface SyncItem {
  /** Stable across renames and moves. */
  id: string;
  /** Path below the location, including the file name. */
  path: string;
  name: string;
  /** Changes whenever the content changes, and only then. */
  version: string;
  size: number;
  unprocessableReason?: SyncItemSkipReason;
}

export interface SyncAccessLost {
  outcome: SyncSourceOutcome.ACCESS_LOST;
}

export interface SyncThrottled {
  outcome: SyncSourceOutcome.THROTTLED;
  retryAt: Date;
}

export interface SyncChanges {
  outcome: SyncSourceOutcome.CHANGES;
  /** Added and changed items, including renamed and moved ones. */
  items: SyncItem[];
  /** Items gone from the location; may include IDs never listed. */
  removedItemIds: string[];
  /** Opaque; passed back on the next listing. */
  cursor: string;
  /** The items are everything below the location: whatever is not listed is gone. */
  fullListing: boolean;
}

export interface SyncItemContent {
  outcome: SyncSourceOutcome.CONTENT;
  content: Readable;
  size: number;
}

export interface SyncItemGone {
  outcome: SyncSourceOutcome.GONE;
}

export interface SyncItemUnprocessable {
  outcome: SyncSourceOutcome.UNPROCESSABLE;
  reason: SyncItemSkipReason;
}

export type SyncChangesResult = SyncChanges | SyncAccessLost | SyncThrottled;

export type SyncItemContentResult =
  | SyncItemContent
  | SyncItemGone
  | SyncItemUnprocessable
  | SyncAccessLost
  | SyncThrottled;
