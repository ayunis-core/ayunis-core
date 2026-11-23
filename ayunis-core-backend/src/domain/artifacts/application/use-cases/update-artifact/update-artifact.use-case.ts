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
import { mapContentText } from 'src/domain/artifacts/application/helpers/map-content-text';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { addVersionWithRetry } from 'src/domain/artifacts/application/helpers/add-version-with-retry';
import { FindLetterheadUseCase } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.use-case';
import { FindLetterheadQuery } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.query';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { UserContentMaskingService } from 'src/domain/artifacts/application/services/user-content-masking.service';
import { ArtifactPlaceholdersService } from 'src/domain/artifacts/application/services/artifact-placeholders.service';
import { runLookup } from 'src/domain/artifacts/application/models/artifact-run';
import type { PlaceholderDraft } from 'src/domain/artifacts/application/models/placeholder-draft';
import type { ArtifactPiiMask } from 'src/domain/artifacts/domain/artifact-pii-mask.entity';

interface ContentWriteContext {
  orgId: UUID;
  userId: UUID;
  command: UpdateArtifactCommand;
}

@Injectable()
export class UpdateArtifactUseCase {
  private readonly logger = new Logger(UpdateArtifactUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
    private readonly findLetterheadUseCase: FindLetterheadUseCase,
    private readonly userContentMaskingService: UserContentMaskingService,
    private readonly artifactPlaceholdersService: ArtifactPlaceholdersService,
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
      runLookup(command.run),
    );
    if (!artifact) {
      throw new ArtifactNotFoundError(command.artifactId);
    }

    const isDocument = artifact instanceof DocumentArtifact;
    this.assertLetterheadAllowed(command, artifact, isDocument);

    if (command.content === undefined) {
      return await this.updateLetterheadOnly(command);
    }

    this.assertExpectedVersion(command, artifact);
    return await this.writeContent(command.content, artifact, {
      orgId,
      userId,
      command,
    });
  }

  private async writeContent(
    rawContent: string,
    artifact: Artifact,
    context: ContentWriteContext,
  ): Promise<ArtifactVersion> {
    const { command, userId } = context;
    const content = prepareContentForWrite(artifact.type, rawContent);
    this.validateContentLength(content);
    if (!artifact.isAnonymous) {
      return this.addContentVersion(command, userId, {
        content,
        isAnonymous: false,
        piiMasks: [],
      });
    }
    return this.artifactPlaceholdersService.write(
      artifact.id,
      await this.draftAnonymousContent(artifact, content, context),
      (anonymized, piiMasks) => {
        this.validateContentLength(anonymized);
        return this.addContentVersion(command, userId, {
          content: anonymized,
          isAnonymous: true,
          piiMasks,
        });
      },
    );
  }

  /**
   * A run writes in its chat's placeholders, which are translated; anything
   * else, such as an editor save, is masked like a chat message.
   */
  private async draftAnonymousContent(
    artifact: Artifact,
    content: string,
    { orgId, command }: ContentWriteContext,
  ): Promise<PlaceholderDraft> {
    if (command.run) {
      return this.artifactPlaceholdersService.fromChat(
        command.run.threadId,
        (translate) => mapContentText(artifact.type, content, translate),
      );
    }
    return this.userContentMaskingService.mask({
      orgId,
      type: artifact.type,
      content,
      currentArtifact: artifact,
    });
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

  private assertExpectedVersion(
    command: UpdateArtifactCommand,
    artifact: Artifact,
  ): void {
    if (
      command.expectedVersionNumber !== undefined &&
      command.expectedVersionNumber !== artifact.currentVersionNumber
    ) {
      throw new ArtifactExpectedVersionMismatchError(
        artifact,
        command.expectedVersionNumber,
        artifact.currentVersionNumber,
      );
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

  /**
   * `isAnonymous` is the mode the content was prepared for, checked again
   * when the version is stored.
   */
  private async addContentVersion(
    command: UpdateArtifactCommand,
    userId: UUID,
    {
      content,
      isAnonymous,
      piiMasks,
    }: { content: string; isAnonymous: boolean; piiMasks: ArtifactPiiMask[] },
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
          runLookup(command.run),
        );
        if (!freshArtifact) {
          throw new ArtifactNotFoundError(command.artifactId);
        }
        this.assertExpectedVersion(command, freshArtifact);

        return {
          expectedCurrentVersionNumber: freshArtifact.currentVersionNumber,
          isAnonymous,
          letterheadId: command.letterheadId,
          piiMasks,
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
