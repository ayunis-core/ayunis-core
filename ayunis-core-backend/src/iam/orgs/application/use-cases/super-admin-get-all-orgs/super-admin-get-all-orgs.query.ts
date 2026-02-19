import type { PaginatedQueryParams } from 'src/common/pagination/paginated.query';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';

const DEFAULT_LIMIT = 50;

export interface SuperAdminGetAllOrgsQueryParams {
  search?: string;
  pagination?: Partial<PaginatedQueryParams>;
}

export class SuperAdminGetAllOrgsQuery extends PaginatedQuery {
  public readonly search?: string;

  constructor(params?: SuperAdminGetAllOrgsQueryParams) {
    super({
      limit: params?.pagination?.limit ?? DEFAULT_LIMIT,
      offset: params?.pagination?.offset ?? 0,
    });
    this.search = params?.search;
  }
}
