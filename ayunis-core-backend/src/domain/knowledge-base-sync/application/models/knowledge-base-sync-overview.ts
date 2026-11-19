import type { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import type { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';
import type { SyncedFilesSummary } from './synced-files-summary';

export interface SyncedLocationOverview {
  location: SyncedLocation;
  product: ConnectorProduct;
  files: SyncedFilesSummary;
}

/** A knowledge base's synced locations, and what may be added to it. */
export interface KnowledgeBaseSyncOverview {
  locations: SyncedLocationOverview[];
  /** The products the organization has set up a connector for. */
  availableProducts: ConnectorProduct[];
}
