import { Injectable, Logger } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { Team } from 'src/iam/teams/domain/team.entity';
import { EntityManager, In, Repository } from 'typeorm';
import { TeamRecord } from './schema/team.record';
import { TeamMemberRecord } from './schema/team-member.record';
import { TeamMapper } from './mappers/team.mapper';
import { UUID } from 'crypto';

@Injectable()
export class LocalTeamsRepository extends TeamsRepository {
  private readonly logger = new Logger(LocalTeamsRepository.name);

  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
    this.logger.log('constructor');
  }

  private getManager(): EntityManager {
    return this.txHost.tx;
  }

  private get teamRepository(): Repository<TeamRecord> {
    return this.getManager().getRepository(TeamRecord);
  }

  async findById(id: UUID): Promise<Team | null> {
    this.logger.log({ id }, 'findById');

    const teamRecord = await this.teamRepository.findOne({
      where: { id },
    });

    if (!teamRecord) {
      this.logger.debug({ id }, 'Team not found');
      return null;
    }

    this.logger.debug({ id, name: teamRecord.name }, 'Team found');
    return TeamMapper.toDomain(teamRecord);
  }

  async findByOrgId(orgId: UUID): Promise<Team[]> {
    this.logger.log({ orgId }, 'findByOrgId');

    const teamRecords = await this.teamRepository.find({
      where: { orgId },
      order: { createdAt: 'DESC' },
    });

    this.logger.debug({ orgId, count: teamRecords.length }, 'Teams found');
    return teamRecords.map((record) => TeamMapper.toDomain(record));
  }

  async findByIdsAndOrgId(ids: UUID[], orgId: UUID): Promise<Team[]> {
    if (ids.length === 0) return [];
    const teamRecords = await this.teamRepository.find({
      where: { id: In(ids), orgId },
    });
    return teamRecords.map((record) => TeamMapper.toDomain(record));
  }

  async findByNameAndOrgId(name: string, orgId: UUID): Promise<Team | null> {
    this.logger.log({ name, orgId }, 'findByNameAndOrgId');

    const teamRecord = await this.teamRepository.findOne({
      where: { name, orgId },
    });

    if (!teamRecord) {
      this.logger.debug({ name, orgId }, 'Team not found');
      return null;
    }

    return TeamMapper.toDomain(teamRecord);
  }

  async findByUserId(userId: UUID): Promise<Team[]> {
    this.logger.log({ userId }, 'findByUserId');

    const teamRecords = await this.teamRepository
      .createQueryBuilder('team')
      .innerJoin(TeamMemberRecord, 'tm', 'tm.team_id = team.id')
      .where('tm.user_id = :userId', { userId })
      .orderBy('team.name', 'ASC')
      .getMany();

    this.logger.debug(
      {
        userId,
        count: teamRecords.length,
      },
      'Teams found for user',
    );
    return teamRecords.map((record) => TeamMapper.toDomain(record));
  }

  async create(team: Team): Promise<Team> {
    this.logger.log(
      {
        id: team.id,
        name: team.name,
        orgId: team.orgId,
      },
      'create',
    );

    const teamRecord = TeamMapper.toRecord(team);
    const savedRecord = await this.teamRepository.save(teamRecord);

    this.logger.debug(
      {
        id: savedRecord.id,
        name: savedRecord.name,
      },
      'Team created successfully',
    );

    return TeamMapper.toDomain(savedRecord);
  }

  async update(team: Team): Promise<Team> {
    this.logger.log(
      {
        id: team.id,
        name: team.name,
      },
      'update',
    );

    const teamRecord = TeamMapper.toRecord(team);
    const savedRecord = await this.teamRepository.save(teamRecord);

    this.logger.debug(
      {
        id: savedRecord.id,
        name: savedRecord.name,
      },
      'Team updated successfully',
    );

    return TeamMapper.toDomain(savedRecord);
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log({ id }, 'delete');

    await this.teamRepository.delete(id);
    this.logger.debug({ id }, 'Team deleted successfully');
  }

  async findByUserIdsAndOrgId(
    userIds: UUID[],
    orgId: UUID,
  ): Promise<Map<UUID, Pick<Team, 'id' | 'name'>[]>> {
    const result = new Map<UUID, Pick<Team, 'id' | 'name'>[]>();
    if (userIds.length === 0) return result;
    const rows = await this.txHost.tx
      .createQueryBuilder()
      .select('member.userId', 'userId')
      .addSelect('team.id', 'id')
      .addSelect('team.name', 'name')
      .from(TeamMemberRecord, 'member')
      .innerJoin(
        TeamRecord,
        'team',
        'team.id = member.teamId AND team.orgId = :orgId',
        { orgId },
      )
      .innerJoin('member.user', 'user', 'user.orgId = :orgId', { orgId })
      .where('member.userId IN (:...userIds)', { userIds })
      .orderBy('team.name', 'ASC')
      .addOrderBy('team.id', 'ASC')
      .getRawMany<Pick<Team, 'id' | 'name'> & { userId: UUID }>();
    for (const row of rows) {
      const teams = result.get(row.userId) ?? [];
      teams.push({ id: row.id, name: row.name });
      result.set(row.userId, teams);
    }
    return result;
  }
}
