import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { WorkspaceKnowledgeBaseLinkRepository } from 'src/domain/knowledge-bases/application/ports/workspace-knowledge-base-link.repository';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { UnlinkKnowledgeBaseFromWorkspaceCommand } from './unlink-knowledge-base-from-workspace.command';

@Injectable()
export class UnlinkKnowledgeBaseFromWorkspaceUseCase {
  private readonly logger = new Logger(
    UnlinkKnowledgeBaseFromWorkspaceUseCase.name,
  );

  constructor(
    private readonly links: WorkspaceKnowledgeBaseLinkRepository,
    @Inject(forwardRef(() => AssertWorkspaceWriteAccessUseCase))
    private readonly workspaceWrite: AssertWorkspaceWriteAccessUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    command: UnlinkKnowledgeBaseFromWorkspaceCommand,
  ): Promise<void> {
    this.logger.log(command, 'Unlinking knowledge base from workspace');
    await this.workspaceWrite.execute({ workspaceId: command.workspaceId });
    await this.links.unlink(command.workspaceId, command.knowledgeBaseId);
  }
}
