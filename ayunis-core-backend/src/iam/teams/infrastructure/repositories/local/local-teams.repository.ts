import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../../application/ports/teams.repository';
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
    this.logger.log('findById', { id });

    const teamRecord = await this.teamRepository.findOne({
      where: { id },
    });

    if (!teamRecord) {
      this.logger.debug('Team not found', { id });
      return null;
    }

    this.logger.debug('Team found', { id, name: teamRecord.name });
    return TeamMapper.toDomain(teamRecord);
  }

  async findByOrgId(orgId: UUID): Promise<Team[]> {
    this.logger.log('findByOrgId', { orgId });

    const teamRecords = await this.teamRepository.find({
      where: { orgId },
      order: { createdAt: 'DESC' },
    });

    this.logger.debug('Teams found', { orgId, count: teamRecords.length });
    return teamRecords.map((record) => TeamMapper.toDomain(record));
  }

  async findByNameAndOrgId(name: string, orgId: UUID): Promise<Team | null> {
    this.logger.log('findByNameAndOrgId', { name, orgId });

    const teamRecord = await this.teamRepository.findOne({
      where: { name, orgId },
    });

    if (!teamRecord) {
      this.logger.debug('Team not found', { name, orgId });
      return null;
    }

    return TeamMapper.toDomain(teamRecord);
  }

  async findByUserId(userId: UUID): Promise<Team[]> {
    this.logger.log('findByUserId', { userId });

    const teamRecords = await this.teamRepository
      .createQueryBuilder('team')
      .innerJoin(TeamMemberRecord, 'tm', 'tm.team_id = team.id')
      .where('tm.user_id = :userId', { userId })
      .orderBy('team.name', 'ASC')
      .getMany();

    this.logger.debug('Teams found for user', {
      userId,
      count: teamRecords.length,
    });
    return teamRecords.map((record) => TeamMapper.toDomain(record));
  }

  async create(team: Team): Promise<Team> {
    this.logger.log('create', {
      id: team.id,
      name: team.name,
      orgId: team.orgId,
    });

    const teamRecord = TeamMapper.toRecord(team);
    const savedRecord = await this.teamRepository.save(teamRecord);

    this.logger.debug('Team created successfully', {
      id: savedRecord.id,
      name: savedRecord.name,
    });

    return TeamMapper.toDomain(savedRecord);
  }

  async update(team: Team): Promise<Team> {
    this.logger.log('update', {
      id: team.id,
      name: team.name,
    });

    const teamRecord = TeamMapper.toRecord(team);
    const savedRecord = await this.teamRepository.save(teamRecord);

    this.logger.debug('Team updated successfully', {
      id: savedRecord.id,
      name: savedRecord.name,
    });

    return TeamMapper.toDomain(savedRecord);
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });

    await this.teamRepository.delete(id);
    this.logger.debug('Team deleted successfully', { id });
  }
}
