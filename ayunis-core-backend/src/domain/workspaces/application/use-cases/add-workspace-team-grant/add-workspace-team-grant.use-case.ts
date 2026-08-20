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
  WorkspaceTeamGrantAlreadyExistsError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { GetTeamQuery } from 'src/iam/teams/application/use-cases/get-team/get-team.query';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { AddWorkspaceTeamGrantCommand } from './add-workspace-team-grant.command';

@Injectable()
export class AddWorkspaceTeamGrantUseCase {
  constructor(
    @InjectPinoLogger(AddWorkspaceTeamGrantUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: WorkspaceTeamGrantsRepository,
    private readonly accessService: WorkspaceAccessService,
    private readonly getTeamUseCase: GetTeamUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: AddWorkspaceTeamGrantCommand,
  ): Promise<WorkspaceTeamGrant> {
    this.logger.info(
      { workspaceId: command.workspaceId, teamId: command.teamId },
      'Adding workspace team grant',
    );
    await this.accessService.requireRole(
      command.workspaceId,
      WorkspaceRole.FULL,
    );
    await this.getTeamUseCase.execute(new GetTeamQuery(command.teamId));
    const grant = await this.repository.createGrant({
      workspaceId: command.workspaceId,
      teamId: command.teamId,
      role: command.role,
    });
    if (!grant) {
      throw new WorkspaceTeamGrantAlreadyExistsError(
        command.workspaceId,
        command.teamId,
      );
    }
    return grant;
  }
}
