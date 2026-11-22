import type { UUID } from 'crypto';
import type { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import type { ConnectorStatus } from 'src/domain/connectors/domain/connector-status.enum';

export interface ConnectorOverview {
  product: ConnectorProduct;
  status: ConnectorStatus;
  /** `null` while the organization never set the product up. */
  connectorId: UUID | null;
}
