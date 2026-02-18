import { Injectable } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { FindArtifactWithVersionsQuery } from './find-artifact-with-versions.query';
import { ArtifactNotFoundError } from '../../artifacts.errors';
import { Artifact } from '../../../domain/artifact.entity';

@Injectable()
export class FindArtifactWithVersionsUseCase {
  constructor(private readonly artifactsRepository: ArtifactsRepository) {}

  async execute(query: FindArtifactWithVersionsQuery): Promise<Artifact> {
    const artifact = await this.artifactsRepository.findByIdWithVersions(
      query.artifactId,
    );
    if (!artifact) {
      throw new ArtifactNotFoundError(query.artifactId);
    }
    return artifact;
  }
}
