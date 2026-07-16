import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { FindArtifactsByThreadQuery } from './find-artifacts-by-thread.query';
import { Artifact } from '../../../domain/artifact.entity';
import { UnexpectedArtifactError } from '../../artifacts.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class FindArtifactsByThreadUseCase {
  private readonly logger = new Logger(FindArtifactsByThreadUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(query: FindArtifactsByThreadQuery): Promise<Artifact[]> {
    this.logger.log('execute', { threadId: query.threadId });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    return this.artifactsRepository.findByThreadId(query.threadId, userId);
  }
}
