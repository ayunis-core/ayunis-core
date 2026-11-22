import type { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';

export class ResolveConnectorLocationQuery {
  readonly product: ConnectorProduct;
  /** A URL a user copied from the product. */
  readonly location: string;

  constructor(params: { product: ConnectorProduct; location: string }) {
    this.product = params.product;
    this.location = params.location;
  }
}
