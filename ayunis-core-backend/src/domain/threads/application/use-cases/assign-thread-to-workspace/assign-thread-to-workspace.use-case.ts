import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { UnexpecteThreadError } from 'src/domain/threads/application/threads.errors';
import { AssignThreadToWorkspaceCommand } from './assign-thread-to-workspace.command';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { DeleteThreadLinksOutsideScopeUseCase } from 'src/domain/artifacts/application/use-cases/delete-thread-links-outside-scope/delete-thread-links-outside-scope.use-case';
import { DeleteThreadLinksOutsideScopeCommand } from 'src/domain/artifacts/application/use-cases/delete-thread-links-outside-scope/delete-thread-links-outside-scope.command';

@Injectable()
export class AssignThreadToWorkspaceUseCase {
  private readonly logger = new Logger(AssignThreadToWorkspaceUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
    private readonly workspaceReadAccess: AssertWorkspaceReadAccessUseCase,
    private readonly deleteThreadLinksOutsideScope: DeleteThreadLinksOutsideScopeUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(command: AssignThreadToWorkspaceCommand): Promise<void> {
    this.logger.log(
      {
        threadId: command.threadId,
        workspaceId: command.workspaceId,
      },
      'assignThreadToWorkspace',
    );

    const userId = this.resolveUserId();

    // Throws WorkspaceNotFoundError for an id the caller does not own, which
    // is what stops a chat being filed into someone else's workspace — the FK
    // alone would happily accept it.
    if (command.workspaceId !== null) {
      await this.workspaceReadAccess.execute({
        workspaceId: command.workspaceId,
      });
    }

    await this.moveThread(command, userId);
  }

  /**
   * Artifacts never move with a chat, so the chat keeps only its links to
   * artifacts of its new scope.
   */
  @Transactional()
  private async moveThread(
    command: AssignThreadToWorkspaceCommand,
    userId: UUID,
  ): Promise<void> {
    // The user-scoped update throws ThreadNotFoundError itself, so no
    // existence pre-check is needed.
    await this.threadsRepository.assignToWorkspace({
      threadId: command.threadId,
      userId,
      workspaceId: command.workspaceId,
    });
    await this.deleteThreadLinksOutsideScope.execute(
      new DeleteThreadLinksOutsideScopeCommand({
        threadId: command.threadId,
        workspaceId: command.workspaceId,
      }),
    );
  }

  private resolveUserId(): UUID {
    const { userId } = getRequiredUserContext(this.contextService);
    return userId;
  }
}
