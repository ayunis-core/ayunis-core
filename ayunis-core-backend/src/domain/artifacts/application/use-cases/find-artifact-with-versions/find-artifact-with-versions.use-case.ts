import { Injectable } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { FindArtifactWithVersionsQuery } from './find-artifact-with-versions.query';
import {
  ArtifactNotFoundError,
  UnexpectedArtifactError,
} from '../../artifacts.errors';
import { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class FindArtifactWithVersionsUseCase {
  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(query: FindArtifactWithVersionsQuery): Promise<Artifact> {
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
