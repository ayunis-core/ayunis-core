import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { TeamMemberRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team-member.record';
import { UserMapper } from 'src/iam/users/infrastructure/repositories/local/mappers/user.mapper';

export class TeamMemberMapper {
  static toDomain(record: TeamMemberRecord): TeamMember {
    return new TeamMember({
      id: record.id,
      teamId: record.teamId,
      userId: record.userId,
      role: record.role,
      user: record.user ? UserMapper.toDomain(record.user) : undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(domain: TeamMember): TeamMemberRecord {
    const record = new TeamMemberRecord();
    record.id = domain.id;
    record.teamId = domain.teamId;
    record.userId = domain.userId;
    record.role = domain.role;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
