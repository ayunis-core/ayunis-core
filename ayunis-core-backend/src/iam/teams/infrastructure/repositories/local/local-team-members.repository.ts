import { Injectable, Logger } from '@nestjs/common';
import { TeamMembersRepository } from '../../../application/ports/team-members.repository';
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
    this.logger.log('findByTeamId', { teamId, pagination });

    const [records, total] = await this.teamMemberRepository.findAndCount({
      where: { teamId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: pagination.offset,
      take: pagination.limit,
    });

    this.logger.debug('Team members found', {
      teamId,
      count: records.length,
    });

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
    this.logger.log('findByTeamIdAndUserId', { teamId, userId });

    const record = await this.teamMemberRepository.findOne({
      where: { teamId, userId },
      relations: ['user'],
    });

    if (!record) {
      this.logger.debug('Team member not found', { teamId, userId });
      return null;
    }

    this.logger.debug('Team member found', { teamId, userId });
    return TeamMemberMapper.toDomain(record);
  }

  async create(teamMember: TeamMember): Promise<TeamMember> {
    this.logger.log('create', {
      id: teamMember.id,
      teamId: teamMember.teamId,
      userId: teamMember.userId,
    });

    const record = TeamMemberMapper.toRecord(teamMember);
    const savedRecord = await this.teamMemberRepository.save(record);

    // Reload with user relation
    const reloadedRecord = await this.teamMemberRepository.findOne({
      where: { id: savedRecord.id },
      relations: ['user'],
    });

    this.logger.debug('Team member created successfully', {
      id: savedRecord.id,
    });

    return TeamMemberMapper.toDomain(reloadedRecord!);
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });

    await this.teamMemberRepository.delete(id);
    this.logger.debug('Team member deleted successfully', { id });
  }

  async deleteByTeamIdAndUserId(teamId: UUID, userId: UUID): Promise<void> {
    this.logger.log('deleteByTeamIdAndUserId', { teamId, userId });

    await this.teamMemberRepository.delete({ teamId, userId });
    this.logger.debug('Team member deleted successfully', { teamId, userId });
  }

  async findAllUserIdsByTeamId(teamId: UUID): Promise<UUID[]> {
    this.logger.log('findAllUserIdsByTeamId', { teamId });

    const records = await this.teamMemberRepository.find({
      where: { teamId },
      select: { userId: true },
    });

    return records.map((record) => record.userId);
  }
}
