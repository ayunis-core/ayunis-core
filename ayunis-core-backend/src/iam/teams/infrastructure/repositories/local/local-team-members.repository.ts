import { Injectable, Logger } from '@nestjs/common';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMemberRecord } from './schema/team-member.record';
import { TeamMemberMapper } from './mappers/team-member.mapper';
import { UUID } from 'crypto';
import { Paginated, PaginatedQueryParams } from 'src/common/pagination';

@Injectable()
export class LocalTeamMembersRepository extends TeamMembersRepository {
  private readonly logger = new Logger(LocalTeamMembersRepository.name);

  constructor(
    @InjectRepository(TeamMemberRecord)
    private readonly teamMemberRepository: Repository<TeamMemberRecord>,
  ) {
    super();
    this.logger.log('constructor');
  }

  async findByTeamId(
    teamId: UUID,
    pagination: PaginatedQueryParams,
  ): Promise<Paginated<TeamMember>> {
    this.logger.log({ teamId, pagination }, 'findByTeamId');

    const [records, total] = await this.teamMemberRepository.findAndCount({
      where: { teamId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: pagination.offset,
      take: pagination.limit,
    });

    this.logger.debug(
      {
        teamId,
        count: records.length,
      },
      'Team members found',
    );

    return new Paginated({
      data: records.map((record) => TeamMemberMapper.toDomain(record)),
      limit: pagination.limit,
      offset: pagination.offset,
      total,
    });
  }

  async findByTeamIdAndUserId(
    teamId: UUID,
    userId: UUID,
  ): Promise<TeamMember | null> {
    this.logger.log({ teamId, userId }, 'findByTeamIdAndUserId');

    const record = await this.teamMemberRepository.findOne({
      where: { teamId, userId },
      relations: ['user'],
    });

    if (!record) {
      this.logger.debug({ teamId, userId }, 'Team member not found');
      return null;
    }

    this.logger.debug({ teamId, userId }, 'Team member found');
    return TeamMemberMapper.toDomain(record);
  }

  async create(teamMember: TeamMember): Promise<TeamMember> {
    this.logger.log(
      {
        id: teamMember.id,
        teamId: teamMember.teamId,
        userId: teamMember.userId,
      },
      'create',
    );

    const record = TeamMemberMapper.toRecord(teamMember);
    const savedRecord = await this.teamMemberRepository.save(record);

    // Reload with user relation
    const reloadedRecord = await this.teamMemberRepository.findOne({
      where: { id: savedRecord.id },
      relations: ['user'],
    });

    this.logger.debug(
      {
        id: savedRecord.id,
      },
      'Team member created successfully',
    );

    return TeamMemberMapper.toDomain(reloadedRecord!);
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log({ id }, 'delete');

    await this.teamMemberRepository.delete(id);
    this.logger.debug({ id }, 'Team member deleted successfully');
  }

  async deleteByTeamIdAndUserId(teamId: UUID, userId: UUID): Promise<void> {
    this.logger.log({ teamId, userId }, 'deleteByTeamIdAndUserId');

    await this.teamMemberRepository.delete({ teamId, userId });
    this.logger.debug({ teamId, userId }, 'Team member deleted successfully');
  }

  async findAllUserIdsByTeamId(teamId: UUID): Promise<UUID[]> {
    this.logger.log({ teamId }, 'findAllUserIdsByTeamId');

    const records = await this.teamMemberRepository.find({
      where: { teamId },
      select: ['userId'],
    });

    this.logger.debug(
      {
        teamId,
        count: records.length,
      },
      'All team member user IDs found',
    );

    return records.map((record) => record.userId);
  }

  async countByTeamIds(teamIds: UUID[]): Promise<Map<UUID, number>> {
    this.logger.log({ count: teamIds.length }, 'countByTeamIds');

    const counts = new Map<UUID, number>(teamIds.map((id) => [id, 0]));
    if (teamIds.length === 0) {
      return counts;
    }

    const rows = await this.teamMemberRepository
      .createQueryBuilder('tm')
      .select('tm.team_id', 'teamId')
      .addSelect('COUNT(*)', 'count')
      .where('tm.team_id IN (:...teamIds)', { teamIds })
      .groupBy('tm.team_id')
      .getRawMany<{ teamId: UUID; count: string }>();

    for (const row of rows) {
      counts.set(row.teamId, Number(row.count));
    }

    return counts;
  }
}
