import type { ProviderRequest } from '@ayunis/inference';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { CountTokensCommand } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.command';
import { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { resolveModelMaxOutputTokens } from 'src/domain/models/domain/model-output-token-limit';
import { ReleasePersonalCreditReservationCommand } from 'src/iam/credit-limits/application/use-cases/release-personal-credit-reservation/release-personal-credit-reservation.command';
import { ReleasePersonalCreditReservationUseCase } from 'src/iam/credit-limits/application/use-cases/release-personal-credit-reservation/release-personal-credit-reservation.use-case';
import { ReservePersonalCreditsCommand } from 'src/iam/credit-limits/application/use-cases/reserve-personal-credits/reserve-personal-credits.command';
import { ReservePersonalCreditsUseCase } from 'src/iam/credit-limits/application/use-cases/reserve-personal-credits/reserve-personal-credits.use-case';
import { GetCreditsPerEuroUseCase } from 'src/iam/platform-config/application/use-cases/get-credits-per-euro/get-credits-per-euro.use-case';

export const INPUT_TOKEN_SAFETY_OVERHEAD = 8192;
export const IMAGE_TOKEN_SAFETY_ALLOWANCE = 8192;
const TOKENS_PER_MILLION = 1_000_000;
const CREDIT_PRECISION = 1_000_000;

export interface PersonalCreditCallAuthorization {
  reservationId: UUID;
  maxOutputTokens: number;
}

@Injectable()
export class PersonalCreditCallBudgetService {
  constructor(
    private readonly reserveCredits: ReservePersonalCreditsUseCase,
    private readonly releaseReservation: ReleasePersonalCreditReservationUseCase,
    private readonly getCreditsPerEuro: GetCreditsPerEuroUseCase,
    private readonly countTokens: CountTokensUseCase,
  ) {}

  async reserve(
    model: LanguageModel,
    request: ProviderRequest,
  ): Promise<PersonalCreditCallAuthorization | null> {
    const creditsPerEuro = await this.getCreditsPerEuro.execute();
    const inputRate =
      ((model.inputTokenCost ?? 0) * creditsPerEuro) / TOKENS_PER_MILLION;
    const outputRate =
      ((model.outputTokenCost ?? 0) * creditsPerEuro) / TOKENS_PER_MILLION;
    const outputTokenLimit = resolveModelMaxOutputTokens(model);
    const inputCredits = this.inputTokenUpperBound(request) * inputRate;
    const minimumCredits = roundCredits(inputCredits + outputRate);
    const requestedCredits = roundCredits(
      inputCredits + outputTokenLimit * outputRate,
    );
    const reservation = await this.reserveCredits.execute(
      new ReservePersonalCreditsCommand(requestedCredits, minimumCredits),
    );
    if (!reservation) return null;
    const maxOutputTokens =
      outputRate === 0
        ? outputTokenLimit
        : Math.max(
            1,
            Math.min(
              outputTokenLimit,
              Math.floor((reservation.credits - inputCredits) / outputRate),
            ),
          );
    return { reservationId: reservation.id, maxOutputTokens };
  }

  async release(reservationId: UUID): Promise<void> {
    await this.releaseReservation.execute(
      new ReleasePersonalCreditReservationCommand(reservationId),
    );
  }

  private inputTokenUpperBound(request: ProviderRequest): number {
    const imageCount = request.messages.reduce(
      (total, message) =>
        total +
        message.content.filter((content) => content.type === 'image').length,
      0,
    );
    const serialized = JSON.stringify({
      instructions: request.instructions,
      messages: request.messages.map((message) => ({
        ...message,
        content: message.content.map((content) =>
          content.type === 'image'
            ? { type: content.type, mediaType: content.mediaType }
            : content,
        ),
      })),
      tools: request.tools,
      toolChoice: request.toolChoice,
    });
    const textTokens = this.countTokens.execute(
      new CountTokensCommand(serialized),
    );
    return (
      textTokens +
      imageCount * IMAGE_TOKEN_SAFETY_ALLOWANCE +
      INPUT_TOKEN_SAFETY_OVERHEAD
    );
  }
}

const roundCredits = (credits: number): number =>
  Math.ceil(credits * CREDIT_PRECISION) / CREDIT_PRECISION;
