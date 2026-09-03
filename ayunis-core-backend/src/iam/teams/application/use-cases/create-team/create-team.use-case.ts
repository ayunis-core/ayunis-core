import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { CreateTeamCommand } from './create-team.command';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { Team } from 'src/iam/teams/domain/team.entity';
import {
  TeamInvalidInputError,
  TeamNameAlreadyExistsError,
  UnexpectedTeamError,
} from 'src/iam/teams/application/teams.errors';
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

    this.logger.log({ name: trimmedName, orgId }, 'createTeam');

    if (!trimmedName) {
      this.logger.warn('Attempted to create team with empty name');
      throw new TeamInvalidInputError('Team name cannot be empty');
    }

    try {
      return await this.createTeam(trimmedName, orgId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error, name: command.name, orgId },
        'Failed to create team',
      );
      throw new UnexpectedTeamError(error);
    }
  }

  private async createTeam(name: string, orgId: UUID): Promise<Team> {
    const existingTeam = await this.teamsRepository.findByNameAndOrgId(
      name,
      orgId,
    );
    if (existingTeam) {
      this.logger.warn({ name, orgId }, 'Team with this name already exists');
      throw new TeamNameAlreadyExistsError(name);
    }

    this.logger.debug({ name, orgId }, 'Creating new team');
    const createdTeam = await this.teamsRepository.create(
      new Team({ name, orgId }),
    );
    this.logger.debug(
      { id: createdTeam.id, name: createdTeam.name },
      'Team created successfully',
    );
    return createdTeam;
  }
}
