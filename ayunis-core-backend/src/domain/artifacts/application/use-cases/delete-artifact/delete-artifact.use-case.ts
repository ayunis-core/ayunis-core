import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  ArtifactNotFoundError,
  UnexpectedArtifactError,
} from 'src/domain/artifacts/application/artifacts.errors';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { DeleteArtifactCommand } from './delete-artifact.command';

/**
 * A personal artifact is deleted by its owner; a workspace artifact by its
 * creator or by members who may manage the workspace. Others who can see it
 * get `UnauthorizedAccessError`, everyone else `ArtifactNotFoundError`.
 * Deleting also deletes its versions, chat links and dictionary.
 */
@Injectable()
export class DeleteArtifactUseCase {
  private readonly logger = new Logger(DeleteArtifactUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly workspaceWriteAccess: AssertWorkspaceWriteAccessUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(command: DeleteArtifactCommand): Promise<void> {
    this.logger.log({ artifactId: command.artifactId }, 'Deleting artifact');
    const { userId } = getRequiredUserContext(this.contextService);
    const artifact = await this.artifactsRepository.findById(
      command.artifactId,
      userId,
    );
    if (!artifact) {
      throw new ArtifactNotFoundError(command.artifactId);
    }
    if (artifact.owner.type === 'workspace' && artifact.creatorId !== userId) {
      await this.workspaceWriteAccess.execute({
        workspaceId: artifact.owner.workspaceId,
      });
    }
    await this.artifactsRepository.delete(artifact.id);
  }
}
