import type { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';

export class RemoveConnectionCommand {
  readonly product: ConnectorProduct;

  constructor(params: { product: ConnectorProduct }) {
    this.product = params.product;
  }
}
