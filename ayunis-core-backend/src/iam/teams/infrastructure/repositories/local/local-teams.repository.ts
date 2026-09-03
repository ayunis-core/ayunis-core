import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { Team } from 'src/iam/teams/domain/team.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamRecord } from './schema/team.record';
import { TeamMemberRecord } from './schema/team-member.record';
import { TeamMapper } from './mappers/team.mapper';
import { UUID } from 'crypto';

@Injectable()
export class LocalTeamsRepository extends TeamsRepository {
  private readonly logger = new Logger(LocalTeamsRepository.name);

  constructor(
    @InjectRepository(TeamRecord)
    private readonly teamRepository: Repository<TeamRecord>,
  ) {
    super();
    this.logger.log('constructor');
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
}
