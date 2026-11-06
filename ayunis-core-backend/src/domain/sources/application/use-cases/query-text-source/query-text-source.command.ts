import type { UUID } from 'crypto';

export class QueryTextSourceCommand {
  orgId: UUID;
  sourceIds: UUID[];
  queries: string[];

  constructor(params: { orgId: UUID; sourceIds: UUID[]; queries: string[] }) {
    this.orgId = params.orgId;
    this.sourceIds = params.sourceIds;
    this.queries = params.queries;
  }
}
