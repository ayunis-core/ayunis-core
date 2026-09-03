import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { FindWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/find-workspace/find-workspace.use-case';
import { FindWorkspaceQuery } from 'src/domain/workspaces/application/use-cases/find-workspace/find-workspace.query';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { UnexpecteThreadError } from 'src/domain/threads/application/threads.errors';
import { AssignThreadToWorkspaceCommand } from './assign-thread-to-workspace.command';

@Injectable()
export class AssignThreadToWorkspaceUseCase {
  private readonly logger = new Logger(AssignThreadToWorkspaceUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
    private readonly findWorkspaceUseCase: FindWorkspaceUseCase,
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
      await this.findWorkspaceUseCase.execute(
        new FindWorkspaceQuery(command.workspaceId),
      );
    }

    // The user-scoped update throws ThreadNotFoundError itself, so no
    // existence pre-check is needed.
    await this.threadsRepository.assignToWorkspace({
      threadId: command.threadId,
      userId,
      workspaceId: command.workspaceId,
    });
  }

  private resolveUserId(): UUID {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    return userId;
  }
}
