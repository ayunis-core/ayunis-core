import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { RemoveDocumentFromWorkspaceCommand } from './remove-document-from-workspace.command';

@Injectable()
export class RemoveDocumentFromWorkspaceUseCase {
  constructor(
    @InjectPinoLogger(RemoveDocumentFromWorkspaceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: RemoveDocumentFromWorkspaceCommand): Promise<void> {
    this.logger.info(
      { workspaceId: command.workspaceId, sourceId: command.sourceId },
      'removeDocumentFromWorkspace',
    );
    const { workspace } = await this.accessService.requireAccessLevel(
      command.workspaceId,
      WorkspaceAccessLevel.EDIT,
    );
    const refs = await this.workspacesRepository.getContextRefs(
      command.workspaceId,
    );
    if (!refs.sourceIds.includes(command.sourceId)) return;

    await this.deleteSourceUseCase.execute(
      new DeleteSourceCommand(command.sourceId, workspace.orgId),
    );
  }
}
