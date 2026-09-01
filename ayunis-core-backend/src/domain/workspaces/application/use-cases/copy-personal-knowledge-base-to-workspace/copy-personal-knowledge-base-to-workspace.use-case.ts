import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Transactional } from '@nestjs-cls/transactional';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { DuplicateKnowledgeBaseDocumentsCommand } from 'src/domain/knowledge-bases/application/use-cases/duplicate-knowledge-base-documents/duplicate-knowledge-base-documents.command';
import { DuplicateKnowledgeBaseDocumentsUseCase } from 'src/domain/knowledge-bases/application/use-cases/duplicate-knowledge-base-documents/duplicate-knowledge-base-documents.use-case';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { CreateKnowledgeBaseCommand } from 'src/domain/knowledge-bases/application/use-cases/create-knowledge-base/create-knowledge-base.command';
import { CreateKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/create-knowledge-base/create-knowledge-base.use-case';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { CopyPersonalKnowledgeBaseToWorkspaceCommand } from './copy-personal-knowledge-base-to-workspace.command';

@Injectable()
export class CopyPersonalKnowledgeBaseToWorkspaceUseCase {
  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
    private readonly createKnowledgeBaseUseCase: CreateKnowledgeBaseUseCase,
    private readonly duplicateKnowledgeBaseDocumentsUseCase: DuplicateKnowledgeBaseDocumentsUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  @Transactional()
  async execute(
    command: CopyPersonalKnowledgeBaseToWorkspaceCommand,
  ): Promise<KnowledgeBase> {
    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();
    const workspace = await this.workspacesRepository.findById(
      userId,
      command.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(command.workspaceId);

    const origin =
      await this.knowledgeBaseAccessService.findAccessibleKnowledgeBase(
        command.knowledgeBaseId,
      );
    if (origin.userId !== userId || origin.workspaceId !== null) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }

    const duplicate = await this.createKnowledgeBaseUseCase.execute(
      new CreateKnowledgeBaseCommand({
        name: origin.name,
        description: origin.description,
        userId,
        orgId,
        workspaceId: command.workspaceId,
        originKnowledgeBaseId: origin.id,
        importedOriginVersion: origin.version,
      }),
    );
    await this.duplicateKnowledgeBaseDocumentsUseCase.execute(
      new DuplicateKnowledgeBaseDocumentsCommand(origin.id, duplicate.id),
    );
    return duplicate;
  }
}
