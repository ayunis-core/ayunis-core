import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { RevertArtifactCommand } from './revert-artifact.command';
import {
  ArtifactNotFoundError,
  ArtifactVersionConflictError,
  ArtifactVersionNotFoundError,
} from '../../artifacts.errors';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { sanitizeHtmlContent } from '../../../domain/sanitize-html-content';
import { ContextService } from 'src/common/context/services/context.service';

const MAX_VERSION_RETRIES = 3;

@Injectable()
export class RevertArtifactUseCase {
  private readonly logger = new Logger(RevertArtifactUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: RevertArtifactCommand): Promise<ArtifactVersion> {
    this.logger.log('Reverting artifact', {
      artifactId: command.artifactId,
      targetVersion: command.versionNumber,
    });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    for (let attempt = 1; attempt <= MAX_VERSION_RETRIES; attempt++) {
      const artifact = await this.artifactsRepository.findByIdWithVersions(
        command.artifactId,
        userId,
      );
      if (!artifact) {
        throw new ArtifactNotFoundError(command.artifactId);
      }

      const targetVersion = artifact.versions.find(
        (v) => v.versionNumber === command.versionNumber,
      );
      if (!targetVersion) {
        throw new ArtifactVersionNotFoundError(
          command.artifactId,
          command.versionNumber,
        );
      }

      const newVersionNumber = artifact.currentVersionNumber + 1;
      const sanitizedContent = sanitizeHtmlContent(targetVersion.content);

      const revertedVersion = new ArtifactVersion({
        artifactId: artifact.id,
        versionNumber: newVersionNumber,
        content: sanitizedContent,
        authorType: AuthorType.USER,
        authorId: userId,
      });

      try {
        return await this.artifactsRepository.addVersionAndUpdateCurrent(
          revertedVersion,
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
