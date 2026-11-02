import { EventEmitter2 } from '@nestjs/event-emitter';
import { AcademyProgressUpdatedEvent } from 'src/domain/academy/application/events/academy-progress-updated.event';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyChapterConfirmation } from 'src/domain/academy/domain/academy-chapter-confirmation.entity';
import type { AcademyChapter } from 'src/domain/academy/domain/academy-chapter.entity';
import { AcademyCompletion } from 'src/domain/academy/domain/academy-completion.entity';
import {
  ChapterModulesBelowMinimumTimeError,
  ChapterNotFoundError,
  UnexpectedAcademyError,
} from 'src/domain/academy/application/academy.errors';
import { AcademyChapterConfirmationRepository } from 'src/domain/academy/application/ports/academy-chapter-confirmation.repository';
import { AcademyChapterRepository } from 'src/domain/academy/application/ports/academy-chapter.repository';
import { AcademyCompletionRepository } from 'src/domain/academy/application/ports/academy-completion.repository';
import { AcademyModuleViewTimeRepository } from 'src/domain/academy/application/ports/academy-module-view-time.repository';
import { GetAcademyMinimumModuleSecondsUseCase } from 'src/iam/platform-config/application/use-cases/get-academy-minimum-module-seconds/get-academy-minimum-module-seconds.use-case';
import { isConfirmationWithinValidity } from 'src/domain/academy/application/util/certificate-validity';
import { isConfirmationReplayable } from 'src/domain/academy/application/util/confirmation-replay';
import { ConfirmChapterCommand } from './confirm-chapter.command';

export interface ChapterConfirmationResult {
  readonly chapterId: UUID;
  readonly confirmedAt: Date;
  readonly academyCompleted: boolean;
}

interface AcademyCompletionState {
  readonly academyCompleted: boolean;
  readonly participationConfirmedAt: Date | null;
}

@Injectable()
export class ConfirmChapterUseCase {
  private readonly logger = new Logger(ConfirmChapterUseCase.name);

  // eslint-disable-next-line max-params -- NestJS injects the confirmation repositories, policy, and event bus.
  constructor(
    private readonly chapterRepository: AcademyChapterRepository,
    private readonly confirmationRepository: AcademyChapterConfirmationRepository,
    private readonly completionRepository: AcademyCompletionRepository,
    private readonly viewTimeRepository: AcademyModuleViewTimeRepository,
    private readonly getMinimumModuleSeconds: GetAcademyMinimumModuleSecondsUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(
    command: ConfirmChapterCommand,
  ): Promise<ChapterConfirmationResult> {
    const { participationConfirmedAt, ...result } =
      await this.confirmChapter(command);
    this.emitAcademyProgress(command.userId, participationConfirmedAt);
    return result;
  }

  // Completion and the page-time reset must commit together: a completion
  // saved without its reset would let the next cycle reuse the old credit.
  @Transactional()
  private async confirmChapter(
    command: ConfirmChapterCommand,
  ): Promise<ChapterConfirmationResult & AcademyCompletionState> {
    this.logger.log(
      { userId: command.userId, chapterId: command.chapterId },
      'Confirming academy chapter',
    );
    const chapter = await this.chapterRepository.findOne(command.chapterId);
    if (!chapter) {
      throw new ChapterNotFoundError(command.chapterId);
    }
    // Without this, two final-chapter requests each miss the other's
    // uncommitted confirmation and neither records the completion.
    await this.confirmationRepository.lockForUser(command.userId);

    const confirmation =
      (await this.findReplayedConfirmation(command)) ??
      (await this.recordConfirmation(chapter, command.userId));
    const completionState = await this.completeAcademyIfEligible(
      command.userId,
    );
    return {
      chapterId: confirmation.chapterId,
      confirmedAt: confirmation.confirmedAt,
      ...completionState,
    };
  }

  private async findReplayedConfirmation(
    command: ConfirmChapterCommand,
  ): Promise<AcademyChapterConfirmation | undefined> {
    const confirmations = await this.confirmationRepository.findAllByUser(
      command.userId,
    );
    return confirmations.find(
      (confirmation) =>
        confirmation.chapterId === command.chapterId &&
        isConfirmationReplayable(confirmation.confirmedAt, new Date()),
    );
  }

  private async recordConfirmation(
    chapter: AcademyChapter,
    userId: UUID,
  ): Promise<AcademyChapterConfirmation> {
    await this.assertModulesReachedMinimumTime(chapter, userId);
    return this.confirmationRepository.upsert(
      new AcademyChapterConfirmation({
        userId,
        chapterId: chapter.id,
        confirmedAt: new Date(),
      }),
    );
  }

  private async assertModulesReachedMinimumTime(
    chapter: AcademyChapter,
    userId: UUID,
  ): Promise<void> {
    if (chapter.courseModules.length === 0) {
      return;
    }
    const [minimumSeconds, viewTimes] = await Promise.all([
      this.getMinimumModuleSeconds.execute(),
      this.viewTimeRepository.findAllByUser(userId),
    ]);
    const secondsByModule = new Map(
      viewTimes.map((viewTime) => [
        viewTime.courseModuleId,
        viewTime.visibleSeconds,
      ]),
    );
    const shortModuleIds = chapter.courseModules
      .filter(
        (courseModule) =>
          (secondsByModule.get(courseModule.id) ?? 0) < minimumSeconds,
      )
      .map((courseModule) => courseModule.id);
    if (shortModuleIds.length > 0) {
      throw new ChapterModulesBelowMinimumTimeError(
        shortModuleIds,
        minimumSeconds,
      );
    }
  }

  private async completeAcademyIfEligible(
    userId: UUID,
  ): Promise<AcademyCompletionState> {
    const [chapterIds, confirmations, completion] = await Promise.all([
      this.chapterRepository.findAllIds(),
      this.confirmationRepository.findAllByUser(userId),
      this.completionRepository.findByUser(userId),
    ]);
    const now = new Date();
    const validConfirmations = new Map(
      confirmations
        .filter((confirmation) =>
          isConfirmationWithinValidity(confirmation.confirmedAt, now),
        )
        .map((confirmation) => [confirmation.chapterId, confirmation]),
    );
    const completed =
      chapterIds.length > 0 &&
      chapterIds.every((chapterId) => validConfirmations.has(chapterId));
    if (!completed) {
      return {
        academyCompleted: false,
        participationConfirmedAt: completion?.completedAt ?? null,
      };
    }

    const startsNewCycle =
      !completion ||
      chapterIds.every((chapterId) => {
        const confirmation = validConfirmations.get(chapterId);
        return (
          confirmation !== undefined &&
          confirmation.confirmedAt.getTime() > completion.completedAt.getTime()
        );
      });
    if (startsNewCycle) {
      await this.stampCompletion(userId, now);
    }
    return {
      academyCompleted: true,
      participationConfirmedAt: startsNewCycle ? now : completion.completedAt,
    };
  }

  private async stampCompletion(
    userId: UUID,
    completedAt: Date,
  ): Promise<void> {
    await this.completionRepository.upsert(
      new AcademyCompletion({ userId, completedAt }),
    );
    // A renewal must earn the minimum time on every video page again.
    await this.viewTimeRepository.deleteAllByUser(userId);
  }

  private emitAcademyProgress(
    userId: UUID,
    participationConfirmedAt: Date | null,
  ): void {
    Promise.resolve()
      .then(() =>
        this.eventEmitter.emitAsync(
          AcademyProgressUpdatedEvent.EVENT_NAME,
          new AcademyProgressUpdatedEvent(userId, participationConfirmedAt),
        ),
      )
      .catch((error: unknown) => {
        this.logger.warn(
          {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Academy progress publication failed',
        );
      });
  }
}
