import { Org } from 'src/iam/orgs/domain/org.entity';
import { OrgRecord } from '../schema/org.record';

export class OrgMapper {
  static toDomain(entity: OrgRecord): Org {
    return new Org({
      id: entity.id,
      name: entity.name,
    });
  }

  static toEntity(domain: Org): OrgRecord {
    const entity = new OrgRecord();
    entity.id = domain.id;
    entity.name = domain.name;
    return entity;
  }
}
