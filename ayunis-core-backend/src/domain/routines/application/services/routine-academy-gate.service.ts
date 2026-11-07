import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { EvaluateAcademyAccessUseCase } from 'src/iam/academy-access/application/use-cases/evaluate-academy-access/evaluate-academy-access.use-case';
import { EvaluateAcademyAccessQuery } from 'src/iam/academy-access/application/use-cases/evaluate-academy-access/evaluate-academy-access.query';
import { AcademyCertificateRequiredError } from 'src/iam/academy-access/application/academy-access.errors';

/**
 * The academy certificate gate a chat message passes (the global
 * `AcademyCertificateGuard`), applied to a routine execution, which has no
 * request for the guard to check.
 */
@Injectable()
export class RoutineAcademyGate {
  constructor(
    private readonly evaluateAcademyAccessUseCase: EvaluateAcademyAccessUseCase,
  ) {}

  async admit(userId: UUID, orgId: UUID): Promise<void> {
    const evaluation = await this.evaluateAcademyAccessUseCase.execute(
      new EvaluateAcademyAccessQuery(userId, orgId),
    );
    if (!evaluation.allowed) {
      throw new AcademyCertificateRequiredError({
        mode: evaluation.mode,
        expiresAt: evaluation.expiresAt,
      });
    }
  }
}
