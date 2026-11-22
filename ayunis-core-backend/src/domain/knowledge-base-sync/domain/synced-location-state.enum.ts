export enum SyncedLocationState {
  ACTIVE = 'active',
  /** The connector lost access; the documents stay until a user removes them. */
  NO_LONGER_ACCESSIBLE = 'no_longer_accessible',
}
