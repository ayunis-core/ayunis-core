import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { FindArtifactsByThreadQuery } from './find-artifacts-by-thread.query';
import { Artifact } from '../../../domain/artifact.entity';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class FindArtifactsByThreadUseCase {
  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindArtifactsByThreadQuery): Promise<Artifact[]> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.artifactsRepository.findByThreadId(query.threadId, userId);
  }
}
