import { Injectable } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { FindArtifactsByThreadQuery } from './find-artifacts-by-thread.query';
import { Artifact } from '../../../domain/artifact.entity';

@Injectable()
export class FindArtifactsByThreadUseCase {
  constructor(private readonly artifactsRepository: ArtifactsRepository) {}

  async execute(query: FindArtifactsByThreadQuery): Promise<Artifact[]> {
    return this.artifactsRepository.findByThreadId(query.threadId);
  }
}
