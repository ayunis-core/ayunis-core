import { UUID } from 'crypto';

export class QueryTextSourceCommand {
  orgId: UUID;
  filter: {
    sourceId: UUID;
    userId: UUID;
  };
  query: string;

  constructor(params: {
    orgId: UUID;
    filter: {
      sourceId: UUID;
      userId: UUID;
    };
    query: string;
  }) {
    this.orgId = params.orgId;
    this.filter = params.filter;
    this.query = params.query;
  }
}
