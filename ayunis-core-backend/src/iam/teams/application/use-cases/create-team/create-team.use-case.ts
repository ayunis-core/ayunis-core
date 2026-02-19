import { Injectable, Logger } from '@nestjs/common';
import { CreateTeamCommand } from './create-team.command';
import { TeamsRepository } from '../../ports/teams.repository';
import { Team } from '../../../domain/team.entity';
import {
  TeamInvalidInputError,
  TeamNameAlreadyExistsError,
  UnexpectedTeamError,
} from '../../teams.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class CreateTeamUseCase {
  private readonly logger = new Logger(CreateTeamUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: CreateTeamCommand): Promise<Team> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    const trimmedName = command.name.trim() || '';

    this.logger.log('createTeam', { name: trimmedName, orgId });

    if (!trimmedName) {
      this.logger.warn('Attempted to create team with empty name');
      throw new TeamInvalidInputError('Team name cannot be empty');
    }

    try {
      const existingTeam = await this.teamsRepository.findByNameAndOrgId(
        trimmedName,
        orgId,
      );

      if (existingTeam) {
        this.logger.warn('Team with this name already exists', {
          name: trimmedName,
          orgId,
        });
        throw new TeamNameAlreadyExistsError(trimmedName);
      }

      this.logger.debug('Creating new team', { name: trimmedName, orgId });
      const team = new Team({ name: trimmedName, orgId });
      const createdTeam = await this.teamsRepository.create(team);
      this.logger.debug('Team created successfully', {
        id: createdTeam.id,
        name: createdTeam.name,
      });

      return createdTeam;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to create team', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: command.name,
        orgId,
      });
      throw new UnexpectedTeamError(error);
    }
  }
}
