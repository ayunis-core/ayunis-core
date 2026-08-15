import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyCompletionRepository } from '../../ports/academy-completion.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import type { AcademyCompletionView } from 'src/domain/academy/domain/academy-completion-view';
import { toAcademyCompletionView } from 'src/domain/academy/application/util/academy-completion-view';
import { GetAcademyCompletionQuery } from './get-academy-completion.query';

/**
 * Whether — and when — a user earned the KI-Führerschein, with the validity
 * period already applied. This is the academy's read surface for consumers that
 * gate on the certificate; they never see the validity period itself.
 */
@Injectable()
export class GetAcademyCompletionUseCase {
  constructor(
    @InjectPinoLogger(GetAcademyCompletionUseCase.name)
    private readonly logger: PinoLogger,
    private readonly completionRepository: AcademyCompletionRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(
    query: GetAcademyCompletionQuery,
  ): Promise<AcademyCompletionView> {
    this.logger.debug({ userId: query.userId }, 'Getting academy completion');

    const completion = await this.completionRepository.findByUser(query.userId);
    if (!completion) {
      return { completedAt: null, expiresAt: null };
    }

    return toAcademyCompletionView(completion);
  }
}
