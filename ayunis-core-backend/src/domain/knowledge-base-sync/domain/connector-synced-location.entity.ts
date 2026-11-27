import type { UUID } from 'crypto';
import {
  SyncedLocation,
  type SyncedLocationParams,
} from './synced-location.entity';
import { SyncedLocationProvider } from './synced-location-provider.enum';

/** A location synced through the organization's connector for a product. */
export class ConnectorSyncedLocation extends SyncedLocation {
  readonly provider = SyncedLocationProvider.CONNECTOR;
  readonly connectorId: UUID;

  constructor(params: SyncedLocationParams & { connectorId: UUID }) {
    super(params);
    this.connectorId = params.connectorId;
  }
}
