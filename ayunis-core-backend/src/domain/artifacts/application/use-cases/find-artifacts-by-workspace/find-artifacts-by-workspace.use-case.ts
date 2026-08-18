import { Injectable } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Artifact } from '../../../domain/artifact.entity';
import { UnexpectedArtifactError } from '../../artifacts.errors';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FindArtifactsByWorkspaceQuery } from './find-artifacts-by-workspace.query';

@Injectable()
export class FindArtifactsByWorkspaceUseCase {
  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(query: FindArtifactsByWorkspaceQuery): Promise<Artifact[]> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    return this.artifactsRepository.findByWorkspaceId(
      query.workspaceId,
      userId,
    );
  }
}
