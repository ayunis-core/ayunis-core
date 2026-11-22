import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedArtifactError } from 'src/domain/artifacts/application/artifacts.errors';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import { artifactOwnerOfChat } from 'src/domain/artifacts/domain/artifact-owner';
import { DeleteThreadLinksOutsideScopeCommand } from './delete-thread-links-outside-scope.command';

/**
 * Called when the caller's chat moves to another scope: deletes its links to
 * artifacts the new scope does not own. The artifacts stay with their owner.
 */
@Injectable()
export class DeleteThreadLinksOutsideScopeUseCase {
  private readonly logger = new Logger(
    DeleteThreadLinksOutsideScopeUseCase.name,
  );

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(command: DeleteThreadLinksOutsideScopeCommand): Promise<void> {
    this.logger.log(
      { threadId: command.threadId, workspaceId: command.workspaceId },
      'Deleting chat links outside the chat scope',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    await this.artifactsRepository.deleteThreadLinksNotOwnedBy(
      command.threadId,
      artifactOwnerOfChat({ userId, workspaceId: command.workspaceId }),
    );
  }
}
