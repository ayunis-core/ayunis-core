import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  ArtifactChatModeMismatchError,
  ArtifactNotFoundError,
  ArtifactOutsideChatScopeError,
  UnexpectedArtifactError,
} from 'src/domain/artifacts/application/artifacts.errors';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import {
  artifactOwnerOfChat,
  isSameArtifactOwner,
} from 'src/domain/artifacts/domain/artifact-owner';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { AttachArtifactToThreadCommand } from './attach-artifact-to-thread.command';

/**
 * Pulls an artifact the caller may read into one of their chats. The artifact
 * must belong to the chat's scope (personal chat: the user's personal
 * artifacts; workspace chat: that workspace's) and have the chat's mode.
 * Attaching an artifact that is linked already changes nothing.
 */
@Injectable()
export class AttachArtifactToThreadUseCase {
  private readonly logger = new Logger(AttachArtifactToThreadUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
    private readonly findThreadUseCase: FindThreadUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(command: AttachArtifactToThreadCommand): Promise<void> {
    const { threadId, artifactId } = command;
    this.logger.log({ threadId, artifactId }, 'Attaching artifact to chat');
    const { userId } = getRequiredUserContext(this.contextService);

    const { thread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(threadId),
    );
    const artifact = await this.artifactsRepository.findById(
      artifactId,
      userId,
    );
    if (!artifact) {
      throw new ArtifactNotFoundError(artifactId);
    }
    if (!isSameArtifactOwner(artifact.owner, artifactOwnerOfChat(thread))) {
      throw new ArtifactOutsideChatScopeError(artifactId, threadId);
    }
    if (artifact.isAnonymous !== thread.isAnonymous) {
      throw new ArtifactChatModeMismatchError(artifactId, threadId);
    }

    const linked = await this.artifactsRepository.linkToMatchingThread(
      threadId,
      artifactId,
      userId,
    );
    // Both matched a moment ago, so the chat has moved to another scope since.
    if (!linked) {
      throw new ArtifactOutsideChatScopeError(artifactId, threadId);
    }
  }
}
