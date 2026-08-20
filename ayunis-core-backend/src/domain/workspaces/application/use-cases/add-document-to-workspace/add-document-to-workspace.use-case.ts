import type { UUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { StartDocumentProcessingCommand } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.command';
import { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceSourceLimitExceededError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { WORKSPACE_MAX_SOURCES } from 'src/domain/workspaces/domain/workspaces.constants';
import { AddDocumentToWorkspaceCommand } from './add-document-to-workspace.command';

@Injectable()
export class AddDocumentToWorkspaceUseCase {
  constructor(
    @InjectPinoLogger(AddDocumentToWorkspaceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly startDocumentProcessingUseCase: StartDocumentProcessingUseCase,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: AddDocumentToWorkspaceCommand): Promise<FileSource> {
    this.logger.info(
      { workspaceId: command.workspaceId, fileName: command.fileName },
      'addDocumentToWorkspace',
    );
    const { workspace } = await this.accessService.requireRole(
      command.workspaceId,
      WorkspaceRole.EDIT,
    );
    await this.assertSourceCapacity(command.workspaceId);
    const source = await this.startDocumentProcessingUseCase.execute(
      new StartDocumentProcessingCommand({
        fileData: command.fileData,
        fileName: command.fileName,
        fileType: command.fileType,
      }),
    );
    try {
      await this.workspacesRepository.attachSource(
        command.workspaceId,
        source.id,
      );
      return source;
    } catch (error) {
      await this.deleteSourceUseCase.execute(
        new DeleteSourceCommand(source.id, workspace.orgId),
      );
      throw error;
    }
  }

  private async assertSourceCapacity(workspaceId: UUID): Promise<void> {
    const refs = await this.workspacesRepository.getContextRefs(workspaceId);
    if (refs.sourceIds.length >= WORKSPACE_MAX_SOURCES) {
      throw new WorkspaceSourceLimitExceededError(WORKSPACE_MAX_SOURCES);
    }
  }
}
