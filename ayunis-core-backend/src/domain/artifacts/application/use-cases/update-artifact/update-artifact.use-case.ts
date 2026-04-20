import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { UpdateArtifactCommand } from './update-artifact.command';
import {
  ArtifactContentTooLargeError,
  ArtifactExpectedVersionMismatchError,
  ArtifactNotFoundError,
  ArtifactLetterheadNotSupportedError,
  UnexpectedArtifactError,
  ARTIFACT_MAX_CONTENT_LENGTH,
} from '../../artifacts.errors';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { Artifact, DocumentArtifact } from '../../../domain/artifact.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { sanitizeHtmlContent } from '../../helpers/sanitize-html-content';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { addVersionWithRetry } from '../../helpers/add-version-with-retry';
import { FindLetterheadUseCase } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.use-case';
import { FindLetterheadQuery } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.query';

@Injectable()
export class UpdateArtifactUseCase {
  private readonly logger = new Logger(UpdateArtifactUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
    private readonly findLetterheadUseCase: FindLetterheadUseCase,
  ) {}

  async execute(
    command: UpdateArtifactCommand,
  ): Promise<ArtifactVersion | void> {
    this.logger.log('Updating artifact', { artifactId: command.artifactId });

    try {
      const userId = this.resolveUserId();
      this.validateContentLength(command.content);

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

      return await this.addContentVersion(command, userId, isDocument);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error('updateArtifactUnexpectedError', {
        artifactId: command.artifactId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedArtifactError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private resolveUserId(): UUID {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    return userId;
  }

  private validateContentLength(content: string | undefined): void {
    if (content !== undefined && content.length > ARTIFACT_MAX_CONTENT_LENGTH) {
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
    isDocument: boolean,
  ): Promise<ArtifactVersion> {
    const content = isDocument
      ? sanitizeHtmlContent(command.content!)
      : command.content!;
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
            command.artifactId,
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
