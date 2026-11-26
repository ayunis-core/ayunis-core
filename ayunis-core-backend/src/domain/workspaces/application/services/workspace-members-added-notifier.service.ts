import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { escapeMarkdown } from 'src/common/util/markdown.util';
import { NotifyUsersCommand } from 'src/domain/notifications/application/use-cases/notify-users/notify-users.command';
import { NotifyUsersUseCase } from 'src/domain/notifications/application/use-cases/notify-users/notify-users.use-case';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';

/** Tells users in their inbox that the caller added them to a workspace. */
@Injectable()
export class WorkspaceMembersAddedNotifier {
  private readonly logger = new Logger(WorkspaceMembersAddedNotifier.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly notifyUsersUseCase: NotifyUsersUseCase,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Best effort: the members are already added and a retry would skip them,
   * so a notification that cannot be sent must not fail the request.
   */
  async notify(workspaceId: UUID, userIds: UUID[]): Promise<void> {
    if (userIds.length === 0) return;
    try {
      await this.send(workspaceId, userIds);
    } catch (error) {
      this.logger.error(
        { workspaceId, recipients: userIds.length, err: error as Error },
        'Could not notify the added workspace members',
      );
    }
  }

  private async send(workspaceId: UUID, userIds: UUID[]): Promise<void> {
    const { userId, orgId } = getRequiredUserContext(this.contextService);
    const [workspace, addedBy] = await Promise.all([
      this.workspacesRepository.findById(userId, workspaceId),
      this.findUserByIdUseCase.execute(new FindUserByIdQuery(userId)),
    ]);
    if (!workspace) throw new WorkspaceNotFoundError(workspaceId);

    // German, like the other texts the backend writes to users. The name stays
    // out of the headline because workspace names may be longer than one.
    await this.notifyUsersUseCase.execute(
      new NotifyUsersCommand({
        userIds,
        orgId,
        type: NotificationType.ORGANIZATION,
        headline: 'Sie wurden zu einem Arbeitsbereich hinzugefügt',
        subheadline: workspace.name,
        body: `${escapeMarkdown(addedBy.name)} hat Sie zum Arbeitsbereich „${escapeMarkdown(workspace.name)}“ hinzugefügt.`,
        workspaceId,
      }),
    );
  }
}
