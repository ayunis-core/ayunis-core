import type { Connector } from 'src/domain/connectors/domain/connector.entity';
import type { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import type { ConnectorCredentialScope } from 'src/domain/connectors/domain/connector-credential-scope.enum';
import type {
  ConnectorChangesResult,
  ConnectorItemContentResult,
} from 'src/domain/connectors/application/models/connector-sync-results';
import type { ConnectorLocationResolution } from 'src/domain/connectors/application/models/connector-location-resolution';

/**
 * How one product lists and reads the files below a synced location. The
 * location is the URL a user added; the cursor is whatever the adapter
 * returned last time, `null` for a first listing.
 */
export abstract class ConnectorSyncAdapter {
  abstract readonly product: ConnectorProduct;

  abstract readonly credentialScope: ConnectorCredentialScope;

  abstract listChanges(
    connector: Connector,
    location: string,
    cursor: string | null,
  ): Promise<ConnectorChangesResult>;

  abstract fetchContent(
    connector: Connector,
    location: string,
    itemId: string,
  ): Promise<ConnectorItemContentResult>;

  /**
   * Checks a pasted URL before it is added as a location. Throws an
   * `ApplicationError` when the connector cannot be used (not set up, or the
   * provider refuses its credentials).
   */
  abstract resolveLocation(
    connector: Connector,
    location: string,
  ): Promise<ConnectorLocationResolution>;
}
