import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import { StartDocumentProcessingCommand } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.command';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { WORKSPACE_MAX_SOURCES } from 'src/domain/workspaces/domain/workspaces.constants';
import { WorkspacesRepository } from '../../ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
  WorkspaceSourceLimitExceededError,
} from '../../workspaces.errors';
import { AddDocumentToWorkspaceCommand } from './add-document-to-workspace.command';

@Injectable()
export class AddDocumentToWorkspaceUseCase {
  private readonly logger = new Logger(AddDocumentToWorkspaceUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly startDocumentProcessingUseCase: StartDocumentProcessingUseCase,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: AddDocumentToWorkspaceCommand): Promise<FileSource> {
    this.logger.log('addDocumentToWorkspace', {
      workspaceId: command.workspaceId,
      fileName: command.fileName,
    });
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    const workspace = await this.workspacesRepository.findById(
      userId,
      command.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(command.workspaceId);

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
