import { Injectable, Logger } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { FindArtifactWithVersionsQuery } from './find-artifact-with-versions.query';
import {
  ArtifactNotFoundError,
  UnexpectedArtifactError,
} from '../../artifacts.errors';
import { Artifact } from '../../../domain/artifact.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class FindArtifactWithVersionsUseCase {
  private readonly logger = new Logger(FindArtifactWithVersionsUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindArtifactWithVersionsQuery): Promise<Artifact> {
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      const artifact = await this.artifactsRepository.findByIdWithVersions(
        query.artifactId,
        userId,
      );
      if (!artifact) {
        throw new ArtifactNotFoundError(query.artifactId);
      }
      return artifact;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error('findArtifactWithVersionsUnexpectedError', {
        artifactId: query.artifactId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedArtifactError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
