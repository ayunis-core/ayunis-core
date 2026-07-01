import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterProgressRepository } from '../../ports/academy-chapter-progress.repository';
import { AcademyCompletionRepository } from '../../ports/academy-completion.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import { GetAcademyProgressQuery } from './get-academy-progress.query';

export interface ChapterProgressView {
  readonly chapterId: UUID;
  readonly passed: boolean;
  readonly lastScore: number;
  readonly lastPassedAt: Date | null;
}

export interface AcademyProgressView {
  readonly chapters: ChapterProgressView[];
  readonly academyCompletedAt: Date | null;
}

@Injectable()
export class GetAcademyProgressUseCase {
  private readonly logger = new Logger(GetAcademyProgressUseCase.name);

  constructor(
    private readonly progressRepository: AcademyChapterProgressRepository,
    private readonly completionRepository: AcademyCompletionRepository,
  ) {}

  async execute(query: GetAcademyProgressQuery): Promise<AcademyProgressView> {
    this.logger.log('Getting academy progress', { userId: query.userId });
    try {
      const progress = await this.progressRepository.findAllByUser(
        query.userId,
      );
      const completion = await this.completionRepository.findByUser(
        query.userId,
      );
      return {
        chapters: progress.map((p) => ({
          chapterId: p.chapterId,
          passed: p.passed,
          lastScore: p.lastScore,
          lastPassedAt: p.passedAt,
        })),
        academyCompletedAt: completion?.completedAt ?? null,
      };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error getting academy progress', {
        error: error as Error,
      });
      throw new UnexpectedAcademyError(error);
    }
  }
}
