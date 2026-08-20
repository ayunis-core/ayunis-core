import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceTeamGrantsRepository } from 'src/domain/workspaces/application/ports/workspace-team-grants-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceTeamGrantNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { RemoveWorkspaceTeamGrantCommand } from './remove-workspace-team-grant.command';

@Injectable()
export class RemoveWorkspaceTeamGrantUseCase {
  constructor(
    @InjectPinoLogger(RemoveWorkspaceTeamGrantUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: WorkspaceTeamGrantsRepository,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: RemoveWorkspaceTeamGrantCommand): Promise<void> {
    this.logger.info(
      { workspaceId: command.workspaceId, teamId: command.teamId },
      'Removing workspace team grant',
    );
    await this.accessService.requireAccessLevel(
      command.workspaceId,
      WorkspaceAccessLevel.FULL,
    );
    const deleted = await this.repository.deleteGrant(
      command.workspaceId,
      command.teamId,
    );
    if (!deleted) {
      throw new WorkspaceTeamGrantNotFoundError(
        command.workspaceId,
        command.teamId,
      );
    }
  }
}
