import type { UUID } from 'crypto';
import type {
  Connector,
  ConnectorSetup,
} from 'src/domain/connectors/domain/connector.entity';
import type { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';

export abstract class ConnectorsRepository {
  abstract findAllByOrgId(orgId: UUID): Promise<Connector[]>;

  abstract findByOrgIdAndProduct(
    orgId: UUID,
    product: ConnectorProduct,
  ): Promise<Connector | null>;

  /**
   * Creates the organization's connector for the product, or replaces the
   * setup and credentials of the existing one, which keeps its ID.
   */
  abstract upsert(connector: Connector): Promise<Connector>;

  /**
   * Replaces the setup of a connector that is set up and keeps its
   * credentials. `null`, changing nothing, while it is not set up.
   */
  abstract updateSetupOfSetUp(
    orgId: UUID,
    product: ConnectorProduct,
    setup: ConnectorSetup,
  ): Promise<Connector | null>;

  /** Clears setup and credentials; the connector itself stays. */
  abstract clearSetupAndCredentials(
    orgId: UUID,
    product: ConnectorProduct,
  ): Promise<void>;
}
