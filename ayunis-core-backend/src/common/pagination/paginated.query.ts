export interface PaginatedQueryParams {
  limit: number;
  offset: number;
}

export abstract class PaginatedQuery {
  public readonly limit: number;
  public readonly offset: number;

  constructor(params: PaginatedQueryParams) {
    this.limit = params.limit;
    this.offset = params.offset;
  }
}
