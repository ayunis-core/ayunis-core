import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { UpdateArtifactCommand } from './update-artifact.command';
import {
  ArtifactContentTooLargeError,
  ArtifactNotFoundError,
  ArtifactVersionConflictError,
  ARTIFACT_MAX_CONTENT_LENGTH,
} from '../../artifacts.errors';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { sanitizeHtmlContent } from '../../../domain/sanitize-html-content';

const MAX_VERSION_RETRIES = 3;

@Injectable()
export class UpdateArtifactUseCase {
  private readonly logger = new Logger(UpdateArtifactUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateArtifactCommand): Promise<ArtifactVersion> {
    this.logger.log('Updating artifact', { artifactId: command.artifactId });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (command.content.length > ARTIFACT_MAX_CONTENT_LENGTH) {
      throw new ArtifactContentTooLargeError(
        command.content.length,
        ARTIFACT_MAX_CONTENT_LENGTH,
      );
    }

    const sanitizedContent = sanitizeHtmlContent(command.content);

    for (let attempt = 1; attempt <= MAX_VERSION_RETRIES; attempt++) {
      const artifact = await this.artifactsRepository.findById(
        command.artifactId,
        userId,
      );
      if (!artifact) {
        throw new ArtifactNotFoundError(command.artifactId);
      }

      const newVersionNumber = artifact.currentVersionNumber + 1;

      const version = new ArtifactVersion({
        artifactId: artifact.id,
        versionNumber: newVersionNumber,
        content: sanitizedContent,
        authorType: command.authorType,
        authorId: command.authorType === AuthorType.USER ? userId : null,
      });

      try {
        return await this.artifactsRepository.addVersionAndUpdateCurrent(
          version,
        );
      } catch (error) {
        if (
          error instanceof ArtifactVersionConflictError &&
          attempt < MAX_VERSION_RETRIES
        ) {
          this.logger.warn(`Version conflict on attempt ${attempt}, retrying`, {
            artifactId: command.artifactId,
            versionNumber: newVersionNumber,
          });
          continue;
        }

        throw error;
      }
    }

    throw new ArtifactVersionConflictError(command.artifactId);
  }
}
