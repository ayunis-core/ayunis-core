import type { UUID } from 'crypto';

export class ListConnectorChangesCommand {
  readonly connectorId: UUID;
  readonly orgId: UUID;
  readonly location: string;
  readonly cursor: string | null;

  constructor(params: {
    connectorId: UUID;
    orgId: UUID;
    location: string;
    cursor: string | null;
  }) {
    this.connectorId = params.connectorId;
    this.orgId = params.orgId;
    this.location = params.location;
    this.cursor = params.cursor;
  }
}
