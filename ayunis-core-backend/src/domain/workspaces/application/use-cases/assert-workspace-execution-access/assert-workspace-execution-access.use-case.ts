import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { FindThreadsByIdsQuery } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.query';
import { FindThreadsByIdsUseCase } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.use-case';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';

@Injectable()
export class AssertWorkspaceExecutionAccessUseCase {
  private readonly logger = new Logger(
    AssertWorkspaceExecutionAccessUseCase.name,
  );

  constructor(
    private readonly readAccess: AssertWorkspaceReadAccessUseCase,
    private readonly findThreads: FindThreadsByIdsUseCase,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(query: { workspaceId: UUID; threadId: UUID }): Promise<void> {
    this.logger.log(query, 'Checking workspace execution access');
    const userId = this.context.get('userId');
    const orgId = this.context.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();

    await this.readAccess.execute({ workspaceId: query.workspaceId });
    const threads = await this.findThreads.execute(
      new FindThreadsByIdsQuery(userId, [query.threadId]),
    );
    if (threads.at(0)?.workspaceId !== query.workspaceId) {
      throw new WorkspaceNotFoundError(query.workspaceId);
    }
  }
}
