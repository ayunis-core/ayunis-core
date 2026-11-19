import type { UUID } from 'crypto';

export class FetchConnectorItemContentCommand {
  readonly connectorId: UUID;
  readonly orgId: UUID;
  readonly location: string;
  readonly itemId: string;

  constructor(params: {
    connectorId: UUID;
    orgId: UUID;
    location: string;
    itemId: string;
  }) {
    this.connectorId = params.connectorId;
    this.orgId = params.orgId;
    this.location = params.location;
    this.itemId = params.itemId;
  }
}
