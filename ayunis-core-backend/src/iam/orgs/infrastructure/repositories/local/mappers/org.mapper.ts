import { Org } from 'src/iam/orgs/domain/org.entity';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserMapper } from 'src/iam/users/infrastructure/repositories/local/mappers/user.mapper';

export class OrgMapper {
  static toDomain(entity: OrgRecord): Org {
    return new Org({
      id: entity.id,
      name: entity.name,
      archived: entity.archived,
      sessionVersion: entity.sessionVersion,
      users: Array.isArray(entity.users)
        ? entity.users.map((user) => UserMapper.toDomain(user))
        : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(domain: Org): OrgRecord {
    const entity = new OrgRecord();
    entity.id = domain.id;
    entity.name = domain.name;
    entity.archived = domain.archived;
    entity.sessionVersion = domain.sessionVersion;
    entity.users = domain.users.map((user) => UserMapper.toEntity(user));
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}
