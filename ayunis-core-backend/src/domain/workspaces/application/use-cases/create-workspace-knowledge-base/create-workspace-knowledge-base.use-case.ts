import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreateKnowledgeBaseCommand } from 'src/domain/knowledge-bases/application/use-cases/create-knowledge-base/create-knowledge-base.command';
import { CreateKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/create-knowledge-base/create-knowledge-base.use-case';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { CreateWorkspaceKnowledgeBaseCommand } from './create-workspace-knowledge-base.command';

@Injectable()
export class CreateWorkspaceKnowledgeBaseUseCase {
  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly createKnowledgeBaseUseCase: CreateKnowledgeBaseUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: CreateWorkspaceKnowledgeBaseCommand,
  ): Promise<KnowledgeBase> {
    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();
    const workspace = await this.workspacesRepository.findById(
      userId,
      command.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(command.workspaceId);

    return this.createKnowledgeBaseUseCase.execute(
      new CreateKnowledgeBaseCommand({
        name: command.name,
        description: command.description,
        userId,
        orgId,
        workspaceId: command.workspaceId,
      }),
    );
  }
}
