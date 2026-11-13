import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';
import { WorkspaceMembersRepository } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceDeletionService } from 'src/domain/workspaces/application/services/workspace-deletion.service';

/**
 * A deleted user's memberships go with the `workspace_members.userId` FK
 * cascade, but their workspaces stay. Once the user row is gone, a workspace
 * left without an admin gets its longest-standing member as admin, and a
 * workspace left without members is deleted through the regular deletion flow
 * so its listeners still clean up storage and source processing. Both wait
 * for the user delete because it can still fail. Failures are logged, never
 * thrown, so they cannot block the user deletion.
 */
@Injectable()
export class WorkspacesUserDeletionRequestedListener {
  private readonly logger = new Logger(
    WorkspacesUserDeletionRequestedListener.name,
  );

  constructor(
    private readonly workspaceMembersRepository: WorkspaceMembersRepository,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly workspaceDeletion: WorkspaceDeletionService,
  ) {}

  @OnEvent(UserDeletionRequestedEvent.EVENT_NAME)
  async handleUserDeletionRequested(
    event: UserDeletionRequestedEvent,
  ): Promise<void> {
    try {
      const workspaceIds =
        await this.workspaceMembersRepository.findWorkspaceIdsByUserId(
          event.userId,
        );
      if (workspaceIds.length === 0) return;

      this.logger.log(
        { userId: event.userId, workspaceCount: workspaceIds.length },
        'Deferring workspace succession for deleted user',
      );
      event.deferCleanup('promote workspace successors', () =>
        this.workspaceMembersRepository.promoteSuccessors(workspaceIds),
      );
      event.deferCleanup('delete memberless workspaces', () =>
        this.deleteMemberless(workspaceIds),
      );
    } catch (error) {
      this.logger.error(
        { userId: event.userId, err: error as Error },
        'Failed to resolve workspaces of deleted user',
      );
    }
  }

  private async deleteMemberless(workspaceIds: UUID[]): Promise<void> {
    const workspaces =
      await this.workspacesRepository.findMemberless(workspaceIds);
    for (const workspace of workspaces) {
      try {
        await this.workspaceDeletion.delete(workspace);
      } catch (error) {
        this.logger.error(
          { workspaceId: workspace.id, err: error as Error },
          'Failed to delete memberless workspace',
        );
      }
    }
  }
}
