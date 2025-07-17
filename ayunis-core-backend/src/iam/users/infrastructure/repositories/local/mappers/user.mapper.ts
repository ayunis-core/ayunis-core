import { User } from 'src/iam/users/domain/user.entity';
import { UserRecord } from '../schema/user.record';

export class UserMapper {
  static toDomain(entity: UserRecord): User {
    return new User({
      id: entity.id,
      email: entity.email,
      emailVerified: entity.emailVerified,
      role: entity.role,
      orgId: entity.orgId,
      passwordHash: entity.passwordHash,
      name: entity.name,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(domain: User): UserRecord {
    const entity = new UserRecord();
    entity.id = domain.id;
    entity.email = domain.email;
    entity.emailVerified = domain.emailVerified;
    entity.role = domain.role;
    entity.orgId = domain.orgId;
    entity.passwordHash = domain.passwordHash;
    entity.name = domain.name;
    entity.updatedAt = domain.updatedAt;
    entity.createdAt = domain.createdAt;
    return entity;
  }
}
