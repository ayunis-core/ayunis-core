import { User } from '../../domain/user.entity';
import { UUID } from 'crypto';

export abstract class UsersRepository {
  abstract findOneById(id: UUID): Promise<User>;
  abstract findOneByEmail(email: string): Promise<User | null>;
  abstract findOneByOrgId(orgId: UUID): Promise<User[]>;
  abstract findManyByOrgId(orgId: UUID): Promise<User[]>;
  abstract create(user: User): Promise<User>;
  abstract update(user: User): Promise<User>;
  abstract delete(id: UUID): Promise<void>;
  abstract validateUser(email: string, password: string): Promise<User>;
  abstract isValidPassword(password: string): Promise<boolean>;
}
