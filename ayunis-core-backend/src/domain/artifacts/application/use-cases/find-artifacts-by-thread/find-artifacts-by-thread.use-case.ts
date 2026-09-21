import { Injectable } from '@nestjs/common';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import { FindArtifactsByThreadQuery } from './find-artifacts-by-thread.query';
import { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedArtifactError } from 'src/domain/artifacts/application/artifacts.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class FindArtifactsByThreadUseCase {
  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(query: FindArtifactsByThreadQuery): Promise<Artifact[]> {
    const { userId } = getRequiredUserContext(this.contextService);

    return await this.artifactsRepository.findByThreadId(
      query.threadId,
      userId,
    );
  }
}
