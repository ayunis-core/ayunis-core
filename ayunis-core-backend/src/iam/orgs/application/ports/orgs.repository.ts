import type { Org } from 'src/iam/orgs/domain/org.entity';
import type { UUID } from 'crypto';
import type { Paginated } from 'src/common/pagination/paginated.entity';

export interface OrgsPagination {
  limit: number;
  offset: number;
}

export interface OrgsFilters {
  search?: string;
}

export abstract class OrgsRepository {
  abstract findById(id: UUID): Promise<Org>;
  abstract findByUserId(userId: UUID): Promise<Org>;
  abstract findAllIds(): Promise<UUID[]>;
  abstract findAllForSuperAdmin(
    pagination: OrgsPagination,
    filters?: OrgsFilters,
  ): Promise<Paginated<Org>>;
  abstract create(org: Org): Promise<Org>;
  abstract update(org: Org): Promise<Org>;
  abstract delete(id: UUID): Promise<void>;
}
