import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { WorkspaceKnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/workspace-knowledge-base-access.service';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
@Injectable()
export class UpdateWorkspaceKnowledgeBaseUseCase {
  private readonly logger = new Logger(
    UpdateWorkspaceKnowledgeBaseUseCase.name,
  );
  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly access: WorkspaceKnowledgeBaseAccessService,
  ) {}
  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(command: {
    workspaceId: UUID;
    knowledgeBaseId: UUID;
    values: Pick<WorkspaceKnowledgeBase, 'name' | 'description'>;
  }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'update-workspace-knowledge-base',
    );
    const knowledgeBase = await this.access.requireInWorkspace(
      command.workspaceId,
      command.knowledgeBaseId,
    );
    return this.repository.save(
      new WorkspaceKnowledgeBase({
        ...knowledgeBase,
        ...command.values,
        updatedAt: new Date(),
      }),
    );
  }
}
