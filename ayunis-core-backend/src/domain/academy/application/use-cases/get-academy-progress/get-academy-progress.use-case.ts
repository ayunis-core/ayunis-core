import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyChapterConfirmationRepository } from 'src/domain/academy/application/ports/academy-chapter-confirmation.repository';
import { AcademyCompletionRepository } from 'src/domain/academy/application/ports/academy-completion.repository';
import { AcademyModuleViewTimeRepository } from 'src/domain/academy/application/ports/academy-module-view-time.repository';
import { GetAcademyMinimumModuleSecondsUseCase } from 'src/iam/platform-config/application/use-cases/get-academy-minimum-module-seconds/get-academy-minimum-module-seconds.use-case';
import { UnexpectedAcademyError } from 'src/domain/academy/application/academy.errors';
import {
  certificateExpiresAt,
  isConfirmationWithinValidity,
} from 'src/domain/academy/application/util/certificate-validity';
import { isConfirmationReplayable } from 'src/domain/academy/application/util/confirmation-replay';
import { GetAcademyProgressQuery } from './get-academy-progress.query';

export interface ChapterProgressView {
  readonly chapterId: UUID;
  readonly confirmed: boolean;
  readonly confirmationValid: boolean;
  readonly confirmedAt: Date;
  readonly replayable: boolean;
}

export interface CourseModuleProgressView {
  readonly courseModuleId: UUID;
  readonly visibleSeconds: number;
}

export interface AcademyProgressView {
  readonly chapters: ChapterProgressView[];
  readonly academyCompletedAt: Date | null;
  readonly academyCompletionExpiresAt: Date | null;
  readonly courseModules: CourseModuleProgressView[];
  readonly minimumModuleSeconds: number;
}

@Injectable()
export class GetAcademyProgressUseCase {
  private readonly logger = new Logger(GetAcademyProgressUseCase.name);

  constructor(
    private readonly confirmationRepository: AcademyChapterConfirmationRepository,
    private readonly completionRepository: AcademyCompletionRepository,
    private readonly viewTimeRepository: AcademyModuleViewTimeRepository,
    private readonly getMinimumModuleSeconds: GetAcademyMinimumModuleSecondsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(query: GetAcademyProgressQuery): Promise<AcademyProgressView> {
    this.logger.log({ userId: query.userId }, 'Getting academy progress');
    const [confirmations, completion, viewTimes, minimumModuleSeconds] =
      await Promise.all([
        this.confirmationRepository.findAllByUser(query.userId),
        this.completionRepository.findByUser(query.userId),
        this.viewTimeRepository.findAllByUser(query.userId),
        this.getMinimumModuleSeconds.execute(),
      ]);
    const now = new Date();
    return {
      chapters: confirmations.map((confirmation) => ({
        chapterId: confirmation.chapterId,
        confirmed: true,
        confirmationValid: isConfirmationWithinValidity(
          confirmation.confirmedAt,
          now,
        ),
        confirmedAt: confirmation.confirmedAt,
        replayable: isConfirmationReplayable(confirmation.confirmedAt, now),
      })),
      academyCompletedAt: completion?.completedAt ?? null,
      academyCompletionExpiresAt: completion
        ? certificateExpiresAt(completion.completedAt)
        : null,
      courseModules: viewTimes.map((viewTime) => ({
        courseModuleId: viewTime.courseModuleId,
        visibleSeconds: viewTime.visibleSeconds,
      })),
      minimumModuleSeconds,
    };
  }
}
