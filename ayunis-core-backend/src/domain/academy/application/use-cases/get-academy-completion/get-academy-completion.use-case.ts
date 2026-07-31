import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyCompletionRepository } from '../../ports/academy-completion.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import { certificateExpiresAt } from '../../util/certificate-validity';
import { GetAcademyCompletionQuery } from './get-academy-completion.query';

export interface AcademyCompletionView {
  readonly completedAt: Date | null;
  readonly expiresAt: Date | null;
}

/**
 * Whether — and when — a user earned the KI-Führerschein, with the validity
 * period already applied. This is the academy's read surface for consumers that
 * gate on the certificate; they never see the validity period itself.
 */
@Injectable()
export class GetAcademyCompletionUseCase {
  private readonly logger = new Logger(GetAcademyCompletionUseCase.name);

  constructor(
    private readonly completionRepository: AcademyCompletionRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(
    query: GetAcademyCompletionQuery,
  ): Promise<AcademyCompletionView> {
    this.logger.debug('Getting academy completion', { userId: query.userId });

    const completion = await this.completionRepository.findByUser(query.userId);
    if (!completion) {
      return { completedAt: null, expiresAt: null };
    }

    return {
      completedAt: completion.completedAt,
      expiresAt: certificateExpiresAt(completion.completedAt),
    };
  }
}
