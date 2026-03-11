import { Injectable, Logger } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { UpdateArtifactCommand } from './update-artifact.command';
import {
  ArtifactContentTooLargeError,
  ArtifactNotFoundError,
  UnexpectedArtifactError,
  ARTIFACT_MAX_CONTENT_LENGTH,
} from '../../artifacts.errors';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { sanitizeHtmlContent } from '../../helpers/sanitize-html-content';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { addVersionWithRetry } from '../../helpers/add-version-with-retry';

@Injectable()
export class UpdateArtifactUseCase {
  private readonly logger = new Logger(UpdateArtifactUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateArtifactCommand): Promise<ArtifactVersion> {
    this.logger.log('Updating artifact', { artifactId: command.artifactId });

    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      if (command.content.length > ARTIFACT_MAX_CONTENT_LENGTH) {
        throw new ArtifactContentTooLargeError(
          command.content.length,
          ARTIFACT_MAX_CONTENT_LENGTH,
        );
      }

      const sanitizedContent = sanitizeHtmlContent(command.content);

      return await addVersionWithRetry({
        repository: this.artifactsRepository,
        logger: this.logger,
        artifactId: command.artifactId,
        buildVersion: async () => {
          const artifact = await this.artifactsRepository.findById(
            command.artifactId,
            userId,
          );
          if (!artifact) {
            throw new ArtifactNotFoundError(command.artifactId);
          }

          return new ArtifactVersion({
            artifactId: artifact.id,
            versionNumber: artifact.currentVersionNumber + 1,
            content: sanitizedContent,
            authorType: command.authorType,
            authorId: command.authorType === AuthorType.USER ? userId : null,
          });
        },
      });
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
}
