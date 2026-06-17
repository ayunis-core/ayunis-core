import { Injectable, Logger } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { FindArtifactsByThreadQuery } from './find-artifacts-by-thread.query';
import { Artifact } from '../../../domain/artifact.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedArtifactError } from '../../artifacts.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class FindArtifactsByThreadUseCase {
  private readonly logger = new Logger(FindArtifactsByThreadUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindArtifactsByThreadQuery): Promise<Artifact[]> {
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      return await this.artifactsRepository.findByThreadId(
        query.threadId,
        userId,
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error('findArtifactsByThreadUnexpectedError', {
        threadId: query.threadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedArtifactError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
