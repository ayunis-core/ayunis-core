import { User } from '../../domain/user.entity';
import { UUID } from 'crypto';
import { Paginated } from 'src/common/pagination';

export interface FindManyByOrgIdOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

export abstract class UsersRepository {
  abstract findOneById(id: UUID): Promise<User | null>;
  abstract findOneByEmail(email: string): Promise<User | null>;
  abstract findManyByOrgId(orgId: UUID): Promise<User[]>;
  abstract findManyByOrgIdPaginated(
    orgId: UUID,
    options?: FindManyByOrgIdOptions,
  ): Promise<Paginated<User>>;
  abstract create(user: User): Promise<User>;
  abstract update(user: User): Promise<User>;
  abstract delete(id: UUID): Promise<void>;
  abstract validateUser(email: string, password: string): Promise<User>;
  abstract isValidPassword(password: string): Promise<boolean>;
}
