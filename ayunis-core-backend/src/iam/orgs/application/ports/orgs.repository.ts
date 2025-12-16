import { Org } from 'src/iam/orgs/domain/org.entity';
import { UUID } from 'crypto';
import { Paginated } from 'src/common/pagination';

export interface FindAllForSuperAdminOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

export abstract class OrgsRepository {
  abstract findById(id: UUID): Promise<Org>;
  abstract findByUserId(userId: UUID): Promise<Org>;
  abstract findAllIds(): Promise<UUID[]>;
  abstract findAllForSuperAdmin(): Promise<Org[]>;
  abstract findAllForSuperAdminPaginated(
    options?: FindAllForSuperAdminOptions,
  ): Promise<Paginated<Org>>;
  abstract create(org: Org): Promise<Org>;
  abstract update(org: Org): Promise<Org>;
  abstract delete(id: UUID): Promise<void>;
}
