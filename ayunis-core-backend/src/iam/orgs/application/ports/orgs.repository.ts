import type { Org } from 'src/iam/orgs/domain/org.entity';
import type { UUID } from 'crypto';
import type { Paginated } from 'src/common/pagination/paginated.entity';

export interface OrgsPagination {
  limit: number;
  offset: number;
}

export interface OrgsFilters {
  search?: string;
  status?: 'active' | 'archived' | 'all';
  subscription?: OrgSubscriptionFilter;
}

export type OrgSubscriptionFilter = 'all' | 'paying' | 'non-paying';

export abstract class OrgsRepository {
  abstract findById(id: UUID, lockForLifecycle?: boolean): Promise<Org>;
  abstract findByUserId(userId: UUID): Promise<Org>;
  abstract findAllIds(): Promise<UUID[]>;
  abstract findAllForSuperAdmin(
    pagination: OrgsPagination,
    filters?: OrgsFilters,
  ): Promise<Paginated<Org>>;
  abstract findPayingOrgIds(orgIds: UUID[]): Promise<UUID[]>;
  abstract create(org: Org): Promise<Org>;
  abstract updateName(id: UUID, name: string): Promise<Org>;
  abstract updateUsageVisibility(
    id: UUID,
    hideIndividualUsage: boolean,
  ): Promise<Org>;
  abstract updateArchived(id: UUID, archived: boolean): Promise<Org>;
  abstract lockForLifecycleMutation(id: UUID): Promise<void>;
  abstract delete(id: UUID, confirmationName?: string): Promise<void>;
}
