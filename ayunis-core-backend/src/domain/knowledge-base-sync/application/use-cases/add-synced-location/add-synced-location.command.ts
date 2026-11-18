import type { UUID } from 'crypto';
import type { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';

export class AddSyncedLocationCommand {
  readonly knowledgeBaseId: UUID;
  readonly product: ConnectorProduct;
  /** The URL the user added; the connector resolves it when listing. */
  readonly location: string;

  constructor(params: {
    knowledgeBaseId: UUID;
    product: ConnectorProduct;
    location: string;
  }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.product = params.product;
    this.location = params.location;
  }
}
