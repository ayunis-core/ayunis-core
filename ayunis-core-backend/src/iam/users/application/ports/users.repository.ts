import type { User } from 'src/iam/users/domain/user.entity';
import type { UUID } from 'crypto';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import type { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { UserSummary } from 'src/iam/users/domain/user-summary';
import type { SuperAdminUserListItem } from 'src/iam/users/domain/super-admin-user-list-item';

export interface UsersPagination {
  limit: number;
  offset: number;
}

export interface UsersFilters {
  search?: string;
}

export abstract class UsersRepository {
  abstract findOneById(id: UUID): Promise<User | null>;
  abstract findManyByIdsAndOrgId(ids: UUID[], orgId: UUID): Promise<User[]>;
  abstract findOneByEmail(email: string): Promise<User | null>;
  abstract findManyByEmails(emails: string[]): Promise<User[]>;
  abstract findManyBySystemRole(role: SystemRole): Promise<User[]>;
  abstract findAdminsByOrgId(orgId: UUID): Promise<User[]>;
  abstract findManyByOrgId(
    orgId: UUID,
    pagination: UsersPagination,
    filters?: UsersFilters,
  ): Promise<Paginated<User>>;
  abstract findAllForSuperAdmin(
    pagination: UsersPagination,
    filters?: UsersFilters,
  ): Promise<Paginated<SuperAdminUserListItem>>;
  abstract findAllIdsByOrgId(orgId: UUID): Promise<UUID[]>;
  abstract findAllSummariesByOrgId(
    orgId: UUID,
    filters?: UsersFilters,
  ): Promise<UserSummary[]>;
  abstract create(user: User): Promise<User>;
  abstract update(user: User): Promise<User>;
  abstract registerFailedLoginAttempt(
    userId: UUID,
    attemptedAt: Date,
    windowStartedAfter: Date,
    lockThreshold: number,
  ): Promise<number | null>;
  abstract resetFailedLoginAttempts(userId: UUID): Promise<boolean>;
  abstract clearLoginLock(userId: UUID): Promise<boolean>;
  abstract delete(id: UUID): Promise<void>;
  abstract isValidPassword(password: string): Promise<boolean>;
}
