import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    @InjectPinoLogger(UpdateTeamUseCase.name)
    private readonly logger: PinoLogger,
    private readonly teamsRepository: TeamsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateTeamCommand): Promise<Team> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    const trimmedName = command.name.trim() || '';

    this.logger.info(
      {
        teamId: command.teamId,
        name: trimmedName,
      },
      'updateTeam',
    );

    if (!trimmedName) {
      this.logger.warn('Attempted to update team with empty name');
      throw new TeamInvalidInputError('Team name cannot be empty');
    }

    try {
      return await this.updateTeam(command, trimmedName, orgId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
          teamId: command.teamId,
          name: command.name,
          orgId,
        },
        'Failed to update team',
      );
      throw new UnexpectedTeamError(error);
    }
  }

  private async updateTeam(
    command: UpdateTeamCommand,
    name: string,
    orgId: UUID,
  ): Promise<Team> {
    const team = await this.getTeam(command.teamId, orgId);
    await this.assertNameAvailable(team, name, orgId);
    this.logger.debug(
      { id: team.id, name: { old: team.name, new: name } },
      'Updating team',
    );

    team.name = name;
    if (command.modelOverrideEnabled !== undefined) {
      team.modelOverrideEnabled = command.modelOverrideEnabled;
    }
    team.updatedAt = new Date();

    const updatedTeam = await this.teamsRepository.update(team);
    this.logger.debug(
      { id: updatedTeam.id, name: updatedTeam.name },
      'Team updated successfully',
    );
    return updatedTeam;
  }

  private async getTeam(teamId: UUID, orgId: UUID): Promise<Team> {
    const team = await this.teamsRepository.findById(teamId);
    if (team?.orgId === orgId) return team;
    this.logger.warn(
      { teamId, orgId },
      'Team not found or belongs to different org',
    );
    throw new TeamNotFoundError(teamId);
  }

  private async assertNameAvailable(
    team: Team,
    name: string,
    orgId: UUID,
  ): Promise<void> {
    if (team.name === name) return;
    const existingTeam = await this.teamsRepository.findByNameAndOrgId(
      name,
      orgId,
    );
    if (!existingTeam || existingTeam.id === team.id) return;
    this.logger.warn({ name, orgId }, 'Team with this name already exists');
    throw new TeamNameAlreadyExistsError(name);
  }
}
