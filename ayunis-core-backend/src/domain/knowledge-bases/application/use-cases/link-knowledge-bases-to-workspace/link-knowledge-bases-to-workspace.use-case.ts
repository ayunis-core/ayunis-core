import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { WorkspaceKnowledgeBaseLinkRepository } from 'src/domain/knowledge-bases/application/ports/workspace-knowledge-base-link.repository';
import { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { LinkKnowledgeBasesToWorkspaceCommand } from './link-knowledge-bases-to-workspace.command';

@Injectable()
export class LinkKnowledgeBasesToWorkspaceUseCase {
  private readonly logger = new Logger(
    LinkKnowledgeBasesToWorkspaceUseCase.name,
  );

  constructor(
    private readonly links: WorkspaceKnowledgeBaseLinkRepository,
    private readonly repository: KnowledgeBaseRepository,
    private readonly access: KnowledgeBaseReadAccessService,
    private readonly context: ContextService,
    @Inject(forwardRef(() => AssertWorkspaceWriteAccessUseCase))
    private readonly workspaceWrite: AssertWorkspaceWriteAccessUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(command: LinkKnowledgeBasesToWorkspaceCommand): Promise<void> {
    this.logger.log(
      {
        workspaceId: command.workspaceId,
        count: command.knowledgeBaseIds.length,
      },
      'Linking knowledge bases to workspace',
    );
    const { userId } = getRequiredUserContext(this.context);
    await this.workspaceWrite.execute({ workspaceId: command.workspaceId });
    const ids = [...new Set(command.knowledgeBaseIds)];
    const found = new Map(
      (await this.repository.findByIds(ids)).map((kb) => [kb.id, kb]),
    );
    for (const id of ids) {
      const knowledgeBase = found.get(id);
      if (!knowledgeBase) throw new KnowledgeBaseNotFoundError(id);
      await this.access.requireLinkable(knowledgeBase);
    }
    await this.links.link(command.workspaceId, ids, userId);
  }
}
