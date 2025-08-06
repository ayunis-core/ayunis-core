import { UUID } from 'crypto';

export class QuerySourceCommand {
  filter: {
    sourceId: UUID;
    userId: UUID;
  };
  query: string;

  constructor(params: {
    filter: {
      sourceId: UUID;
      userId: UUID;
    };
    query: string;
  }) {
    this.filter = params.filter;
    this.query = params.query;
  }
}
