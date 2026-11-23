import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import { UpdateArtifactCommand } from './update-artifact.command';
import {
  ArtifactContentTooLargeError,
  ArtifactExpectedVersionMismatchError,
  ArtifactNotFoundError,
  ArtifactLetterheadNotSupportedError,
  UnexpectedArtifactError,
  ARTIFACT_MAX_CONTENT_LENGTH,
} from 'src/domain/artifacts/application/artifacts.errors';
import { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import {
  Artifact,
  DocumentArtifact,
} from 'src/domain/artifacts/domain/artifact.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { prepareContentForWrite } from 'src/domain/artifacts/application/helpers/prepare-content-for-write';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { addVersionWithRetry } from 'src/domain/artifacts/application/helpers/add-version-with-retry';
import { FindLetterheadUseCase } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.use-case';
import { FindLetterheadQuery } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.query';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { UserContentMaskingService } from 'src/domain/artifacts/application/services/user-content-masking.service';
import { FindThreadsByIdsUseCase } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.use-case';
import { FindThreadsByIdsQuery } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.query';

interface ContentWriteContext {
  userId: UUID;
  orgId: UUID;
  authorType: AuthorType;
}

@Injectable()
export class UpdateArtifactUseCase {
  private readonly logger = new Logger(UpdateArtifactUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
    private readonly findLetterheadUseCase: FindLetterheadUseCase,
    private readonly findThreadsByIdsUseCase: FindThreadsByIdsUseCase,
    private readonly userContentMaskingService: UserContentMaskingService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(
    command: UpdateArtifactCommand,
  ): Promise<ArtifactVersion | void> {
    this.logger.log({ artifactId: command.artifactId }, 'Updating artifact');

    const { userId, orgId } = getRequiredUserContext(this.contextService);

    if (command.letterheadId) {
      await this.findLetterheadUseCase.execute(
        new FindLetterheadQuery({ letterheadId: command.letterheadId }),
      );
    }

    const artifact = await this.artifactsRepository.findById(
      command.artifactId,
      userId,
    );
    if (!artifact) {
      throw new ArtifactNotFoundError(command.artifactId);
    }

    const isDocument = artifact instanceof DocumentArtifact;
    this.assertLetterheadAllowed(command, artifact, isDocument);

    if (command.content === undefined) {
      return await this.updateLetterheadOnly(command);
    }

    const content = await this.prepareContent(command.content, artifact, {
      userId,
      orgId,
      authorType: command.authorType ?? AuthorType.USER,
    });
    return await this.addContentVersion(command, userId, content);
  }

  private async prepareContent(
    rawContent: string,
    artifact: Artifact,
    context: ContentWriteContext,
  ): Promise<string> {
    const content = prepareContentForWrite(artifact.type, rawContent);
    this.validateContentLength(content);
    if (context.authorType !== AuthorType.USER) {
      return content;
    }
    const masked = await this.userContentMaskingService.mask({
      thread: await this.findArtifactThread(artifact, context.userId),
      orgId: context.orgId,
      type: artifact.type,
      content,
      currentArtifact: artifact,
    });
    this.validateContentLength(masked);
    return masked;
  }

  private async findArtifactThread(artifact: Artifact, userId: UUID) {
    const threads = await this.findThreadsByIdsUseCase.execute(
      new FindThreadsByIdsQuery(userId, [artifact.threadId]),
    );
    const thread = threads.at(0);
    if (!thread) {
      throw new ArtifactNotFoundError(artifact.id);
    }
    return thread;
  }

  private validateContentLength(content: string): void {
    if (content.length > ARTIFACT_MAX_CONTENT_LENGTH) {
      throw new ArtifactContentTooLargeError(
        content.length,
        ARTIFACT_MAX_CONTENT_LENGTH,
      );
    }
  }

  private assertLetterheadAllowed(
    command: UpdateArtifactCommand,
    artifact: Artifact,
    isDocument: boolean,
  ): void {
    if (command.letterheadId !== undefined && !isDocument) {
      throw new ArtifactLetterheadNotSupportedError(artifact.type);
    }
  }

  private async updateLetterheadOnly(
    command: UpdateArtifactCommand,
  ): Promise<void> {
    if (command.letterheadId !== undefined) {
      await this.artifactsRepository.updateLetterheadId(
        command.artifactId,
        command.letterheadId,
      );
    }
  }

  private async addContentVersion(
    command: UpdateArtifactCommand,
    userId: UUID,
    content: string,
  ): Promise<ArtifactVersion> {
    const authorType = command.authorType ?? AuthorType.USER;

    return addVersionWithRetry({
      repository: this.artifactsRepository,
      logger: this.logger,
      artifactId: command.artifactId,
      buildVersion: async () => {
        const freshArtifact = await this.artifactsRepository.findById(
          command.artifactId,
          userId,
        );
        if (!freshArtifact) {
          throw new ArtifactNotFoundError(command.artifactId);
        }

        if (
          command.expectedVersionNumber !== undefined &&
          command.expectedVersionNumber !== freshArtifact.currentVersionNumber
        ) {
          throw new ArtifactExpectedVersionMismatchError(
            freshArtifact,
            command.expectedVersionNumber,
            freshArtifact.currentVersionNumber,
          );
        }

        return {
          expectedCurrentVersionNumber: freshArtifact.currentVersionNumber,
          letterheadId: command.letterheadId,
          version: new ArtifactVersion({
            artifactId: freshArtifact.id,
            versionNumber: freshArtifact.currentVersionNumber + 1,
            content,
            authorType,
            authorId: authorType === AuthorType.USER ? userId : null,
          }),
        };
      },
    });
  }
}
