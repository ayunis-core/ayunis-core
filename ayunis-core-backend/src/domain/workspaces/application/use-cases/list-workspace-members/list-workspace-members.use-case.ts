import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { WorkspaceMemberProfile } from 'src/domain/workspaces/application/models/workspace-member-profile.model';
import { WorkspaceMembersRepository } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { WorkspaceMemberProfilesService } from 'src/domain/workspaces/application/services/workspace-member-profiles.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { ListWorkspaceMembersQuery } from './list-workspace-members.query';

@Injectable()
export class ListWorkspaceMembersUseCase {
  private readonly logger = new Logger(ListWorkspaceMembersUseCase.name);

  constructor(
    private readonly membersRepository: WorkspaceMembersRepository,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly profiles: WorkspaceMemberProfilesService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: ListWorkspaceMembersQuery,
  ): Promise<WorkspaceMemberProfile[]> {
    this.logger.log(
      { workspaceId: query.workspaceId },
      'Listing workspace members',
    );

    await this.workspaceAccess.requireMember(query.workspaceId);
    const members = await this.membersRepository.findAllByWorkspaceId(
      query.workspaceId,
    );
    return this.profiles.load(members);
  }
}
