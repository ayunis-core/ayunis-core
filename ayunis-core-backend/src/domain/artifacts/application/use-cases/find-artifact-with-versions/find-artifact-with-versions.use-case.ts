import { Injectable } from '@nestjs/common';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import { FindArtifactWithVersionsQuery } from './find-artifact-with-versions.query';
import {
  ArtifactNotFoundError,
  UnexpectedArtifactError,
} from 'src/domain/artifacts/application/artifacts.errors';
import { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class FindArtifactWithVersionsUseCase {
  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(query: FindArtifactWithVersionsQuery): Promise<Artifact> {
    const { userId } = getRequiredUserContext(this.contextService);

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
