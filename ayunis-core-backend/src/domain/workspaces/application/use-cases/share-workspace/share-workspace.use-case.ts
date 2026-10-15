import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  WorkspaceSharingContextService,
  type SharingContext,
} from 'src/domain/workspaces/application/services/workspace-sharing-context.service';
import { requireInviteRight } from 'src/domain/workspaces/application/services/workspace-sharing.guards';
import {
  InvalidWorkspaceShareTargetError,
  UnexpectedWorkspaceError,
  WorkspaceInsufficientAccessError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { ShareWorkspaceCommand } from './share-workspace.command';

@Injectable()
export class ShareWorkspaceUseCase {
  private readonly logger = new Logger(ShareWorkspaceUseCase.name);

  constructor(private readonly sharing: WorkspaceSharingContextService) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  @Transactional()
  async execute(
    command: ShareWorkspaceCommand,
  ): Promise<{ unlinkedCount: number }> {
    this.logger.log(
      {
        workspaceId: command.workspaceId,
        people: command.userIds.length,
        teams: command.teamIds.length,
      },
      'Sharing workspace',
    );
    const userIds = [...new Set(command.userIds)];
    const teamIds = [...new Set(command.teamIds)];
    if (userIds.length + teamIds.length === 0) {
      throw new InvalidWorkspaceShareTargetError('nobody to invite');
    }
    const context = await this.sharing.load(command.workspaceId);
    requireInviteRight(context);
    this.requireReachable(context, userIds, teamIds);
    context.sharing.invite(
      { userIds, teamIds, level: command.accessLevel, at: new Date() },
      context.directory,
    );
    return this.sharing.save(context);
  }

  private requireReachable(
    context: SharingContext,
    userIds: UUID[],
    teamIds: UUID[],
  ): void {
    const { directory, rights, workspace } = context;
    const unknown = [
      ...userIds.filter((id) => !directory.person(id)),
      ...teamIds.filter((id) => !directory.team(id)),
    ];
    if (unknown.length > 0) {
      throw new InvalidWorkspaceShareTargetError('not in this organisation', {
        ids: unknown,
      });
    }
    const outOfScope = [
      ...userIds.filter((id) => !rights.mayReach(id, directory)),
      ...teamIds.filter((id) => !rights.mayInviteTeam(id)),
    ];
    if (outOfScope.length > 0) {
      throw new WorkspaceInsufficientAccessError(workspace.id, {
        ids: outOfScope,
      });
    }
  }
}
