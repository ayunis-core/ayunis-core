import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  WorkspaceTeamGrantsRepository,
  type WorkspaceTeamGrant,
} from 'src/domain/workspaces/application/ports/workspace-team-grants-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceTeamGrantNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { UpdateWorkspaceTeamGrantAccessLevelCommand } from './update-workspace-team-grant-access-level.command';

@Injectable()
export class UpdateWorkspaceTeamGrantAccessLevelUseCase {
  constructor(
    @InjectPinoLogger(UpdateWorkspaceTeamGrantAccessLevelUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: WorkspaceTeamGrantsRepository,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: UpdateWorkspaceTeamGrantAccessLevelCommand,
  ): Promise<WorkspaceTeamGrant> {
    this.logger.info(
      { workspaceId: command.workspaceId, teamId: command.teamId },
      'Updating workspace team grant access level',
    );
    await this.accessService.requireAccessLevel(
      command.workspaceId,
      WorkspaceAccessLevel.FULL,
    );
    const grant = await this.repository.updateGrantAccessLevel(
      command.workspaceId,
      command.teamId,
      command.accessLevel,
    );
    if (!grant) {
      throw new WorkspaceTeamGrantNotFoundError(
        command.workspaceId,
        command.teamId,
      );
    }
    return grant;
  }
}
