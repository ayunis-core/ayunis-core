import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceSharingReadRepository } from 'src/domain/workspaces/application/ports/workspace-sharing-read-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceTeamGrantNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { FindAllUserIdsByTeamIdQuery } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.query';
import { FindAllUserIdsByTeamIdUseCase } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.use-case';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import type { User } from 'src/iam/users/domain/user.entity';
import { ListWorkspaceTeamMembersQuery } from './list-workspace-team-members.query';

@Injectable()
export class ListWorkspaceTeamMembersUseCase {
  constructor(
    @InjectPinoLogger(ListWorkspaceTeamMembersUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: WorkspaceSharingReadRepository,
    private readonly accessService: WorkspaceAccessService,
    private readonly findUserIds: FindAllUserIdsByTeamIdUseCase,
    private readonly findUsers: FindUsersByIdsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(query: ListWorkspaceTeamMembersQuery): Promise<User[]> {
    this.logger.info(
      { workspaceId: query.workspaceId, teamId: query.teamId },
      'Listing workspace team members',
    );
    await this.accessService.requireRole(query.workspaceId, WorkspaceRole.FULL);
    const sharing = await this.repository.findSharing(query.workspaceId);
    if (!sharing.teamGrants.some(({ teamId }) => teamId === query.teamId)) {
      throw new WorkspaceTeamGrantNotFoundError(
        query.workspaceId,
        query.teamId,
      );
    }
    const userIds = await this.findUserIds.execute(
      new FindAllUserIdsByTeamIdQuery(query.teamId),
    );
    return this.findUsers.execute(new FindUsersByIdsQuery(userIds));
  }
}
