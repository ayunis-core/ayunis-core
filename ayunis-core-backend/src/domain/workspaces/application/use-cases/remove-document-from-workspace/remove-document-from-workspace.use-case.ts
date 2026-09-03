import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { RemoveDocumentFromWorkspaceCommand } from './remove-document-from-workspace.command';

@Injectable()
export class RemoveDocumentFromWorkspaceUseCase {
  private readonly logger = new Logger(RemoveDocumentFromWorkspaceUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: RemoveDocumentFromWorkspaceCommand): Promise<void> {
    this.logger.log(
      {
        workspaceId: command.workspaceId,
        sourceId: command.sourceId,
      },
      'removeDocumentFromWorkspace',
    );
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    const workspace = await this.workspacesRepository.findById(
      userId,
      command.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(command.workspaceId);

    const refs = await this.workspacesRepository.getContextRefs(
      command.workspaceId,
    );
    if (!refs.sourceIds.includes(command.sourceId)) return;

    await this.deleteSourceUseCase.execute(
      new DeleteSourceCommand(command.sourceId, workspace.orgId),
    );
  }
}
