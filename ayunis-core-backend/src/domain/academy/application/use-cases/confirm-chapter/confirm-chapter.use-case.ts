import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyChapterConfirmation } from 'src/domain/academy/domain/academy-chapter-confirmation.entity';
import { AcademyCompletion } from 'src/domain/academy/domain/academy-completion.entity';
import {
  ChapterNotFoundError,
  UnexpectedAcademyError,
} from 'src/domain/academy/application/academy.errors';
import { AcademyChapterConfirmationRepository } from 'src/domain/academy/application/ports/academy-chapter-confirmation.repository';
import { AcademyChapterRepository } from 'src/domain/academy/application/ports/academy-chapter.repository';
import { AcademyCompletionRepository } from 'src/domain/academy/application/ports/academy-completion.repository';
import { isConfirmationWithinValidity } from 'src/domain/academy/application/util/certificate-validity';
import { ConfirmChapterCommand } from './confirm-chapter.command';

export interface ChapterConfirmationResult {
  readonly chapterId: UUID;
  readonly confirmedAt: Date;
  readonly academyCompleted: boolean;
}

@Injectable()
export class ConfirmChapterUseCase {
  constructor(
    @InjectPinoLogger(ConfirmChapterUseCase.name)
    private readonly logger: PinoLogger,
    private readonly chapterRepository: AcademyChapterRepository,
    private readonly confirmationRepository: AcademyChapterConfirmationRepository,
    private readonly completionRepository: AcademyCompletionRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(
    command: ConfirmChapterCommand,
  ): Promise<ChapterConfirmationResult> {
    this.logger.info(
      { userId: command.userId, chapterId: command.chapterId },
      'Confirming academy chapter',
    );
    const chapter = await this.chapterRepository.findOne(command.chapterId);
    if (!chapter) {
      throw new ChapterNotFoundError(command.chapterId);
    }

    const confirmation = await this.confirmationRepository.upsert(
      new AcademyChapterConfirmation({
        userId: command.userId,
        chapterId: command.chapterId,
        confirmedAt: new Date(),
      }),
    );
    const academyCompleted = await this.completeAcademyIfEligible(
      command.userId,
    );
    return {
      chapterId: confirmation.chapterId,
      confirmedAt: confirmation.confirmedAt,
      academyCompleted,
    };
  }

  private async completeAcademyIfEligible(userId: UUID): Promise<boolean> {
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
      return false;
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
      await this.completionRepository.upsert(
        new AcademyCompletion({ userId, completedAt: now }),
      );
    }
    return true;
  }
}
