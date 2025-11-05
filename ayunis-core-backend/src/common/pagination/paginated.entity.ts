export class Paginated<T> {
  public readonly data: T[];
  public readonly limit: number;
  public readonly offset: number;
  public readonly total?: number;

  constructor(params: {
    data: T[];
    limit: number;
    offset: number;
    total?: number;
  }) {
    this.data = params.data;
    this.limit = params.limit;
    this.offset = params.offset;
    this.total = params.total;
  }
}
