import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceTeamMemberOverridesRepository } from 'src/domain/workspaces/application/ports/workspace-team-member-overrides-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceTeamOverrideNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { ResetWorkspaceTeamMemberOverrideCommand } from './reset-workspace-team-member-override.command';

@Injectable()
export class ResetWorkspaceTeamMemberOverrideUseCase {
  constructor(
    @InjectPinoLogger(ResetWorkspaceTeamMemberOverrideUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: WorkspaceTeamMemberOverridesRepository,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: ResetWorkspaceTeamMemberOverrideCommand,
  ): Promise<void> {
    this.logger.info(
      {
        workspaceId: command.workspaceId,
        teamId: command.teamId,
        userId: command.userId,
      },
      'Resetting workspace team member override',
    );
    await this.accessService.requireRole(
      command.workspaceId,
      WorkspaceRole.FULL,
    );
    const deleted = await this.repository.deleteOverride(
      command.workspaceId,
      command.teamId,
      command.userId,
    );
    if (!deleted) {
      throw new WorkspaceTeamOverrideNotFoundError(
        command.teamId,
        command.userId,
      );
    }
  }
}
