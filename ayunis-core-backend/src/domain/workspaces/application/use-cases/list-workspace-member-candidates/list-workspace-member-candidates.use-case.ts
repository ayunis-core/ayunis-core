import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { WorkspaceMemberCandidate } from 'src/domain/workspaces/application/models/workspace-member-candidate.model';
import { WorkspaceMembersRepository } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { SearchOrgUsersQuery } from 'src/iam/users/application/use-cases/search-org-users/search-org-users.query';
import { SearchOrgUsersUseCase } from 'src/iam/users/application/use-cases/search-org-users/search-org-users.use-case';
import { ListWorkspaceMemberCandidatesQuery } from './list-workspace-member-candidates.query';

const CANDIDATE_LIMIT = 25;

/**
 * Colleagues who can be added to the workspace. Gated by the workspace role
 * rather than an org permission: the org-wide user list needs
 * `assign_users_to_teams`, which workspace managers usually lack.
 */
@Injectable()
export class ListWorkspaceMemberCandidatesUseCase {
  private readonly logger = new Logger(
    ListWorkspaceMemberCandidatesUseCase.name,
  );

  constructor(
    private readonly membersRepository: WorkspaceMembersRepository,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly searchOrgUsers: SearchOrgUsersUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: ListWorkspaceMemberCandidatesQuery,
  ): Promise<WorkspaceMemberCandidate[]> {
    const { workspaceId } = query;
    this.logger.log(
      { workspaceId, hasSearch: query.search !== undefined },
      'Listing workspace member candidates',
    );

    await this.workspaceAccess.requirePermission(
      workspaceId,
      Permission.MANAGE_WORKSPACE_MEMBERS,
    );
    const members =
      await this.membersRepository.findAllByWorkspaceId(workspaceId);
    const users = await this.searchOrgUsers.execute(
      new SearchOrgUsersQuery({
        search: query.search,
        excludeIds: members.map((member) => member.userId),
        limit: CANDIDATE_LIMIT,
      }),
    );
    return users.map(({ id, name, email }) => ({ userId: id, name, email }));
  }
}
