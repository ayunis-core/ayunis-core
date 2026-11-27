/**
 * Where a location's files come from, and so which subclass and sync source
 * it has. Not the product: a connector location's product is its connector's.
 */
export enum SyncedLocationProvider {
  CONNECTOR = 'connector',
  /** A website, crawled without a connection. */
  WEB = 'web',
}
