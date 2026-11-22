import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { ConnectorProduct } from './connector-product.enum';
import { ConnectorStatus } from './connector-status.enum';

/** Product-specific settings that are not secret, e.g. a tenant ID. */
export type ConnectorSetup = Readonly<Record<string, string>>;

export class Connector {
  readonly id: UUID;
  readonly orgId: UUID;
  readonly product: ConnectorProduct;
  setup: ConnectorSetup;
  /**
   * The product's secrets, encrypted as one value. `null` once the connection
   * is removed: the connector itself stays, so whatever references it is
   * reconnected when it is set up again.
   */
  encryptedCredentials: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    orgId: UUID;
    product: ConnectorProduct;
    setup?: ConnectorSetup;
    encryptedCredentials?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.product = params.product;
    this.setup = params.setup ?? {};
    this.encryptedCredentials = params.encryptedCredentials ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  get status(): ConnectorStatus {
    return this.encryptedCredentials === null
      ? ConnectorStatus.NOT_SET_UP
      : ConnectorStatus.SET_UP;
  }
}
