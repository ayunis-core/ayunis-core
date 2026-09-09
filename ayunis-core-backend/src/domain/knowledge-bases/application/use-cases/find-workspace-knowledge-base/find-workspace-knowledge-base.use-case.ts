import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { WorkspaceKnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/workspace-knowledge-base-access.service';
@Injectable()
export class FindWorkspaceKnowledgeBaseUseCase {
  private readonly logger = new Logger(FindWorkspaceKnowledgeBaseUseCase.name);
  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly access: WorkspaceKnowledgeBaseAccessService,
  ) {}
  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(command: { workspaceId: UUID; knowledgeBaseId: UUID }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'find-workspace-knowledge-base',
    );
    const knowledgeBase = await this.access.requireInWorkspace(
      command.workspaceId,
      command.knowledgeBaseId,
    );
    const states = await this.repository.getWorkspaceStates(
      [command.knowledgeBaseId],
      command.workspaceId,
    );
    return {
      knowledgeBase,
      ...(states.get(knowledgeBase.id) ?? { isActive: false }),
    };
  }
}
