import { User } from '../../domain/user.entity';
import { UUID } from 'crypto';
import { Paginated } from 'src/common/pagination/paginated.entity';

export interface UsersPagination {
  limit: number;
  offset: number;
}

export interface UsersFilters {
  search?: string;
}

export abstract class UsersRepository {
  abstract findOneById(id: UUID): Promise<User | null>;
  abstract findOneByEmail(email: string): Promise<User | null>;
  abstract findManyByEmails(emails: string[]): Promise<User[]>;
  abstract findManyByOrgId(
    orgId: UUID,
    pagination: UsersPagination,
    filters?: UsersFilters,
  ): Promise<Paginated<User>>;
  abstract findAllIdsByOrgId(orgId: UUID): Promise<UUID[]>;
  abstract create(user: User): Promise<User>;
  abstract update(user: User): Promise<User>;
  abstract delete(id: UUID): Promise<void>;
  abstract validateUser(email: string, password: string): Promise<User>;
  abstract isValidPassword(password: string): Promise<boolean>;
}
