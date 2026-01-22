import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../../application/ports/teams.repository';
import { Team } from 'src/iam/teams/domain/team.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamRecord } from './schema/team.record';
import { TeamMapper } from './mappers/team.mapper';
import { UUID } from 'crypto';
import {
  TeamCreationFailedError,
  TeamDeletionFailedError,
  TeamRetrievalFailedError,
} from '../../../application/teams.errors';

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

    try {
      const teamRecord = await this.teamRepository.findOne({
        where: { id },
      });

      if (!teamRecord) {
        this.logger.debug('Team not found', { id });
        return null;
      }

      this.logger.debug('Team found', { id, name: teamRecord.name });
      return TeamMapper.toDomain(teamRecord);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error('Error finding team', { error: err, id });
      throw new TeamRetrievalFailedError(err.message);
    }
  }

  async findByOrgId(orgId: UUID): Promise<Team[]> {
    this.logger.log('findByOrgId', { orgId });

    try {
      const teamRecords = await this.teamRepository.find({
        where: { orgId },
        order: { createdAt: 'DESC' },
      });

      this.logger.debug('Teams found', { orgId, count: teamRecords.length });
      return teamRecords.map((record) => TeamMapper.toDomain(record));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error('Error finding teams by org', { error: err, orgId });
      throw new TeamRetrievalFailedError(err.message);
    }
  }

  async findByNameAndOrgId(name: string, orgId: UUID): Promise<Team | null> {
    this.logger.log('findByNameAndOrgId', { name, orgId });

    try {
      const teamRecord = await this.teamRepository.findOne({
        where: { name, orgId },
      });

      if (!teamRecord) {
        this.logger.debug('Team not found', { name, orgId });
        return null;
      }

      return TeamMapper.toDomain(teamRecord);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error('Error finding team by name and org', {
        error: err,
        name,
        orgId,
      });
      throw new TeamRetrievalFailedError(err.message);
    }
  }

  async create(team: Team): Promise<Team> {
    this.logger.log('create', {
      id: team.id,
      name: team.name,
      orgId: team.orgId,
    });

    try {
      const teamRecord = TeamMapper.toRecord(team);
      const savedRecord = await this.teamRepository.save(teamRecord);

      this.logger.debug('Team created successfully', {
        id: savedRecord.id,
        name: savedRecord.name,
      });

      return TeamMapper.toDomain(savedRecord);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error('Error creating team', {
        error: err,
        id: team.id,
        name: team.name,
      });

      throw new TeamCreationFailedError(
        `Failed to create team: ${err.message}`,
      );
    }
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });

    try {
      await this.teamRepository.delete(id);
      this.logger.debug('Team deleted successfully', { id });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error('Error deleting team', { error: err, id });
      throw new TeamDeletionFailedError(
        `Failed to delete team: ${err.message}`,
      );
    }
  }
}
