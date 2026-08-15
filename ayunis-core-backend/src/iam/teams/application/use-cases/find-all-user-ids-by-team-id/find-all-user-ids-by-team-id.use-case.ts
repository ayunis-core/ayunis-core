import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UUID } from 'crypto';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { FindAllUserIdsByTeamIdQuery } from './find-all-user-ids-by-team-id.query';

/**
 * Use case for retrieving all user IDs belonging to a team.
 * Returns all IDs without pagination, intended for internal batch operations.
 */
@Injectable()
export class FindAllUserIdsByTeamIdUseCase {
  constructor(
    @InjectPinoLogger(FindAllUserIdsByTeamIdUseCase.name)
    private readonly logger: PinoLogger,
    private readonly teamMembersRepository: TeamMembersRepository,
  ) {}

  async execute(query: FindAllUserIdsByTeamIdQuery): Promise<UUID[]> {
    this.logger.info({ teamId: query.teamId }, 'execute');

    return this.teamMembersRepository.findAllUserIdsByTeamId(query.teamId);
  }
}
