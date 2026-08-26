import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  WorkspaceTeamMemberOverridesRepository,
  type WorkspaceTeamMemberOverride,
} from 'src/domain/workspaces/application/ports/workspace-team-member-overrides-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceTeamGrantNotFoundError,
  WorkspaceTeamOverrideUserNotEligibleError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { CheckUserTeamMembershipQuery } from 'src/iam/teams/application/use-cases/check-user-team-membership/check-user-team-membership.query';
import { CheckUserTeamMembershipUseCase } from 'src/iam/teams/application/use-cases/check-user-team-membership/check-user-team-membership.use-case';
import { SetWorkspaceTeamMemberOverrideCommand } from './set-workspace-team-member-override.command';

@Injectable()
export class SetWorkspaceTeamMemberOverrideUseCase {
  constructor(
    @InjectPinoLogger(SetWorkspaceTeamMemberOverrideUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: WorkspaceTeamMemberOverridesRepository,
    private readonly accessService: WorkspaceAccessService,
    private readonly checkMembershipUseCase: CheckUserTeamMembershipUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: SetWorkspaceTeamMemberOverrideCommand,
  ): Promise<WorkspaceTeamMemberOverride> {
    this.logger.info(
      {
        workspaceId: command.workspaceId,
        teamId: command.teamId,
        userId: command.userId,
      },
      'Setting workspace team member override',
    );
    await this.accessService.requireAccessLevel(
      command.workspaceId,
      WorkspaceAccessLevel.FULL,
    );
    await this.ensureTeamGrantExists(command);
    const isTeamMember = await this.checkMembershipUseCase.execute(
      new CheckUserTeamMembershipQuery({
        teamId: command.teamId,
        userId: command.userId,
      }),
    );
    if (!isTeamMember) {
      throw new WorkspaceTeamOverrideUserNotEligibleError(
        command.teamId,
        command.userId,
      );
    }
    const override = await this.repository.upsertOverride(
      command.workspaceId,
      command.teamId,
      { userId: command.userId, ...command.value },
    );
    if (!override) {
      throw new WorkspaceTeamGrantNotFoundError(
        command.workspaceId,
        command.teamId,
      );
    }
    return override;
  }

  private async ensureTeamGrantExists(
    command: SetWorkspaceTeamMemberOverrideCommand,
  ): Promise<void> {
    const exists = await this.repository.hasTeamGrant(
      command.workspaceId,
      command.teamId,
    );
    if (!exists) {
      throw new WorkspaceTeamGrantNotFoundError(
        command.workspaceId,
        command.teamId,
      );
    }
  }
}
