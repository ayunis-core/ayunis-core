import type { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';

export class FindSetUpConnectorQuery {
  constructor(public readonly product: ConnectorProduct) {}
}
