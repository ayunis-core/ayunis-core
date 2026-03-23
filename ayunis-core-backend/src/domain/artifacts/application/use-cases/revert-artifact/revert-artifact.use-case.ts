import { Injectable, Logger } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { RevertArtifactCommand } from './revert-artifact.command';
import {
  ArtifactNotFoundError,
  ArtifactVersionNotFoundError,
  UnexpectedArtifactError,
} from '../../artifacts.errors';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { sanitizeHtmlContent } from '../../helpers/sanitize-html-content';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { addVersionWithRetry } from '../../helpers/add-version-with-retry';

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

    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      return await addVersionWithRetry({
        repository: this.artifactsRepository,
        logger: this.logger,
        artifactId: command.artifactId,
        buildVersion: async () => {
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

          return {
            expectedCurrentVersionNumber: artifact.currentVersionNumber,
            version: new ArtifactVersion({
              artifactId: artifact.id,
              versionNumber: artifact.currentVersionNumber + 1,
              content: sanitizeHtmlContent(targetVersion.content),
              authorType: AuthorType.USER,
              authorId: userId,
            }),
          };
        },
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error('revertArtifactUnexpectedError', {
        artifactId: command.artifactId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedArtifactError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
