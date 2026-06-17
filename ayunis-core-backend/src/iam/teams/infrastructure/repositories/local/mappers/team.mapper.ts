import { Team } from 'src/iam/teams/domain/team.entity';
import { TeamRecord } from '../schema/team.record';

export class TeamMapper {
  static toDomain(record: TeamRecord): Team {
    return new Team({
      id: record.id,
      name: record.name,
      orgId: record.orgId,
      modelOverrideEnabled: record.modelOverrideEnabled,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(domain: Team): TeamRecord {
    const record = new TeamRecord();
    record.id = domain.id;
    record.name = domain.name;
    record.orgId = domain.orgId;
    record.modelOverrideEnabled = domain.modelOverrideEnabled;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
