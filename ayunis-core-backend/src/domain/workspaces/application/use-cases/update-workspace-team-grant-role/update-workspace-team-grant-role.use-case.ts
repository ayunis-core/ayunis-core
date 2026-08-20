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
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { UpdateWorkspaceTeamGrantRoleCommand } from './update-workspace-team-grant-role.command';

@Injectable()
export class UpdateWorkspaceTeamGrantRoleUseCase {
  constructor(
    @InjectPinoLogger(UpdateWorkspaceTeamGrantRoleUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: WorkspaceTeamGrantsRepository,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: UpdateWorkspaceTeamGrantRoleCommand,
  ): Promise<WorkspaceTeamGrant> {
    this.logger.info(
      { workspaceId: command.workspaceId, teamId: command.teamId },
      'Updating workspace team grant role',
    );
    await this.accessService.requireRole(
      command.workspaceId,
      WorkspaceRole.FULL,
    );
    const grant = await this.repository.updateGrantRole(
      command.workspaceId,
      command.teamId,
      command.role,
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
