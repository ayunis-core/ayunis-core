import { Injectable, Logger } from '@nestjs/common';
import { UpdateTeamCommand } from './update-team.command';
import { TeamsRepository } from '../../ports/teams.repository';
import { Team } from '../../../domain/team.entity';
import {
  TeamInvalidInputError,
  TeamNameAlreadyExistsError,
  TeamNotFoundError,
  UnexpectedTeamError,
} from '../../teams.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class UpdateTeamUseCase {
  private readonly logger = new Logger(UpdateTeamUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateTeamCommand): Promise<Team> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    const trimmedName = command.name.trim() || '';

    this.logger.log('updateTeam', {
      teamId: command.teamId,
      name: trimmedName,
    });

    if (!trimmedName) {
      this.logger.warn('Attempted to update team with empty name');
      throw new TeamInvalidInputError('Team name cannot be empty');
    }

    try {
      const team = await this.teamsRepository.findById(command.teamId);

      if (!team || team.orgId !== orgId) {
        this.logger.warn('Team not found or belongs to different org', {
          teamId: command.teamId,
          orgId,
        });
        throw new TeamNotFoundError(command.teamId);
      }

      // Only check for duplicates if the name is being changed
      if (team.name !== trimmedName) {
        const existingTeam = await this.teamsRepository.findByNameAndOrgId(
          trimmedName,
          orgId,
        );

        if (existingTeam && existingTeam.id !== command.teamId) {
          this.logger.warn('Team with this name already exists', {
            name: trimmedName,
            orgId,
          });
          throw new TeamNameAlreadyExistsError(trimmedName);
        }
      }

      this.logger.debug('Updating team', {
        id: team.id,
        oldName: team.name,
        newName: trimmedName,
      });

      team.name = trimmedName;
      team.updatedAt = new Date();

      const updatedTeam = await this.teamsRepository.update(team);

      this.logger.debug('Team updated successfully', {
        id: updatedTeam.id,
        name: updatedTeam.name,
      });

      return updatedTeam;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to update team', {
        error: error instanceof Error ? error.message : 'Unknown error',
        teamId: command.teamId,
        name: command.name,
        orgId,
      });
      throw new UnexpectedTeamError(error);
    }
  }
}
