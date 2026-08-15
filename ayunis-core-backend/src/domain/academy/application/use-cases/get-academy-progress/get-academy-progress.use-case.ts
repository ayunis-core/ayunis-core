import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterProgressRepository } from '../../ports/academy-chapter-progress.repository';
import { AcademyCompletionRepository } from '../../ports/academy-completion.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import {
  certificateExpiresAt,
  isPassWithinValidity,
} from '../../util/certificate-validity';
import { GetAcademyProgressQuery } from './get-academy-progress.query';

export interface ChapterProgressView {
  readonly chapterId: UUID;
  readonly passed: boolean;
  /**
   * Whether the pass is recent enough to still count toward a completion.
   * Orgs requiring annual recertification need this to show a lapsed learner
   * which chapters they have to redo — `passed` alone stays true forever.
   */
  readonly passValid: boolean;
  readonly lastScore: number;
  readonly lastPassedAt: Date | null;
}

export interface AcademyProgressView {
  readonly chapters: ChapterProgressView[];
  readonly academyCompletedAt: Date | null;
  readonly academyCompletionExpiresAt: Date | null;
}

@Injectable()
export class GetAcademyProgressUseCase {
  constructor(
    @InjectPinoLogger(GetAcademyProgressUseCase.name)
    private readonly logger: PinoLogger,
    private readonly progressRepository: AcademyChapterProgressRepository,
    private readonly completionRepository: AcademyCompletionRepository,
  ) {}

  async execute(query: GetAcademyProgressQuery): Promise<AcademyProgressView> {
    this.logger.info({ userId: query.userId }, 'Getting academy progress');
    try {
      const progress = await this.progressRepository.findAllByUser(
        query.userId,
      );
      const completion = await this.completionRepository.findByUser(
        query.userId,
      );
      const now = new Date();
      return {
        chapters: progress.map((p) => ({
          chapterId: p.chapterId,
          passed: p.passed,
          passValid:
            p.passedAt !== null && isPassWithinValidity(p.passedAt, now),
          lastScore: p.lastScore,
          lastPassedAt: p.passedAt,
        })),
        academyCompletedAt: completion?.completedAt ?? null,
        academyCompletionExpiresAt: completion
          ? certificateExpiresAt(completion.completedAt)
          : null,
      };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error getting academy progress',
      );
      throw new UnexpectedAcademyError(error);
    }
  }
}
