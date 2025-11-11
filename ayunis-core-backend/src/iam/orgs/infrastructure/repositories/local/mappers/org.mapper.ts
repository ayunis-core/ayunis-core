import { Org } from 'src/iam/orgs/domain/org.entity';
import { OrgRecord } from '../schema/org.record';
import { UserMapper } from '../../../../../users/infrastructure/repositories/local/mappers/user.mapper';

export class OrgMapper {
  static toDomain(entity: OrgRecord): Org {
    return new Org({
      id: entity.id,
      name: entity.name,
      users: entity.users ? entity.users.map(UserMapper.toDomain) : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(domain: Org): OrgRecord {
    const entity = new OrgRecord();
    entity.id = domain.id;
    entity.name = domain.name;
    if (domain.users) {
      entity.users = domain.users.map(UserMapper.toEntity);
    }
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}
