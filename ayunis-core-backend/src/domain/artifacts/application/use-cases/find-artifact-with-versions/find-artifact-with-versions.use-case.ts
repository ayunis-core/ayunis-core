import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { FindArtifactWithVersionsQuery } from './find-artifact-with-versions.query';
import { ArtifactNotFoundError } from '../../artifacts.errors';
import { Artifact } from '../../../domain/artifact.entity';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class FindArtifactWithVersionsUseCase {
  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindArtifactWithVersionsQuery): Promise<Artifact> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
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
