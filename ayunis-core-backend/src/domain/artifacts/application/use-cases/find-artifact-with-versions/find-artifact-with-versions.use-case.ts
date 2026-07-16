import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { FindArtifactWithVersionsQuery } from './find-artifact-with-versions.query';
import {
  ArtifactNotFoundError,
  UnexpectedArtifactError,
} from '../../artifacts.errors';
import { Artifact } from '../../../domain/artifact.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class FindArtifactWithVersionsUseCase {
  private readonly logger = new Logger(FindArtifactWithVersionsUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(query: FindArtifactWithVersionsQuery): Promise<Artifact> {
    this.logger.log('execute', { artifactId: query.artifactId });

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
  }
}
