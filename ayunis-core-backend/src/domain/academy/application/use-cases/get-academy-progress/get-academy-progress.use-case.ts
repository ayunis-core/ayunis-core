import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyChapterConfirmationRepository } from 'src/domain/academy/application/ports/academy-chapter-confirmation.repository';
import { AcademyCompletionRepository } from 'src/domain/academy/application/ports/academy-completion.repository';
import { UnexpectedAcademyError } from 'src/domain/academy/application/academy.errors';
import {
  certificateExpiresAt,
  isConfirmationWithinValidity,
} from 'src/domain/academy/application/util/certificate-validity';
import { GetAcademyProgressQuery } from './get-academy-progress.query';

export interface ChapterProgressView {
  readonly chapterId: UUID;
  readonly confirmed: boolean;
  readonly confirmationValid: boolean;
  readonly confirmedAt: Date;
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
    private readonly confirmationRepository: AcademyChapterConfirmationRepository,
    private readonly completionRepository: AcademyCompletionRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(query: GetAcademyProgressQuery): Promise<AcademyProgressView> {
    this.logger.info({ userId: query.userId }, 'Getting academy progress');
    const [confirmations, completion] = await Promise.all([
      this.confirmationRepository.findAllByUser(query.userId),
      this.completionRepository.findByUser(query.userId),
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
      })),
      academyCompletedAt: completion?.completedAt ?? null,
      academyCompletionExpiresAt: completion
        ? certificateExpiresAt(completion.completedAt)
        : null,
    };
  }
}
