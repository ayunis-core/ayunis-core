import type { ProviderRequest } from '@ayunis/inference';
import { randomUUID } from 'crypto';
import type { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { GetCreditsPerEuroUseCase } from 'src/iam/platform-config/application/use-cases/get-credits-per-euro/get-credits-per-euro.use-case';
import type { ReleasePersonalCreditReservationUseCase } from 'src/iam/credit-limits/application/use-cases/release-personal-credit-reservation/release-personal-credit-reservation.use-case';
import type { ReservePersonalCreditsUseCase } from 'src/iam/credit-limits/application/use-cases/reserve-personal-credits/reserve-personal-credits.use-case';
import { LanguageModel as LanguageModelEntity } from 'src/domain/models/domain/models/language.model';
import {
  IMAGE_TOKEN_SAFETY_ALLOWANCE,
  INPUT_TOKEN_SAFETY_OVERHEAD,
  PersonalCreditCallBudgetService,
} from './personal-credit-call-budget.service';

describe('PersonalCreditCallBudgetService', () => {
  let reserveCredits: jest.Mocked<ReservePersonalCreditsUseCase>;
  let releaseReservation: jest.Mocked<ReleasePersonalCreditReservationUseCase>;
  let getCreditsPerEuro: jest.Mocked<GetCreditsPerEuroUseCase>;
  let countTokens: jest.Mocked<CountTokensUseCase>;
  let service: PersonalCreditCallBudgetService;

  const model: LanguageModel = new LanguageModelEntity({
    name: 'claude-sonnet-4',
    provider: ModelProvider.BEDROCK,
    displayName: 'Claude Sonnet 4',
    canStream: true,
    canUseTools: true,
    isReasoning: false,
    canVision: true,
    isArchived: false,
    inputTokenCost: 3,
    outputTokenCost: 15,
  });
  const request: ProviderRequest = {
    instructions: 'Answer precisely.',
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: 'Explain the 1969 legal position.' }],
      },
    ],
    tools: [],
  };

  beforeEach(() => {
    reserveCredits = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ReservePersonalCreditsUseCase>;
    releaseReservation = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ReleasePersonalCreditReservationUseCase>;
    getCreditsPerEuro = {
      execute: jest.fn().mockResolvedValue(1_000_000),
    } as unknown as jest.Mocked<GetCreditsPerEuroUseCase>;
    countTokens = {
      execute: jest.fn().mockReturnValue(120),
    } as unknown as jest.Mocked<CountTokensUseCase>;
    service = new PersonalCreditCallBudgetService(
      reserveCredits,
      releaseReservation,
      getCreditsPerEuro,
      countTokens,
    );
  });

  it('leaves provider output unchanged when the user has no personal limit', async () => {
    reserveCredits.execute.mockResolvedValue(null);

    await expect(service.reserve(model, request)).resolves.toBeNull();
  });

  it('reserves a conservative input bound plus the normal output ceiling', async () => {
    const reservationId = randomUUID();
    reserveCredits.execute.mockImplementation(async (command) => ({
      id: reservationId,
      credits: command.requestedCredits,
    }));

    const authorization = await service.reserve(model, request);

    expect(authorization).toEqual({
      reservationId,
      maxOutputTokens: 32_000,
    });
    const command = reserveCredits.execute.mock.calls[0][0];
    const inputUpperBound = 120 + INPUT_TOKEN_SAFETY_OVERHEAD;
    expect(command.minimumCredits).toBe(inputUpperBound * 3 + 15);
    expect(command.requestedCredits).toBe(inputUpperBound * 3 + 32_000 * 15);
  });

  it('counts image content without treating base64 bytes as tokens', async () => {
    const reservationId = randomUUID();
    const imageData = Buffer.alloc(200_000, 1).toString('base64');
    const visionRequest: ProviderRequest = {
      ...request,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this planning diagram.' },
            { type: 'image', data: imageData, mediaType: 'image/jpeg' },
          ],
        },
      ],
    };
    reserveCredits.execute.mockImplementation(async (command) => ({
      id: reservationId,
      credits: command.requestedCredits,
    }));

    await service.reserve(model, visionRequest);

    const countedText = countTokens.execute.mock.calls[0][0].text;
    expect(countedText).not.toContain(imageData);
    const command = reserveCredits.execute.mock.calls[0][0];
    const inputUpperBound =
      120 + INPUT_TOKEN_SAFETY_OVERHEAD + IMAGE_TOKEN_SAFETY_ALLOWANCE;
    expect(command.minimumCredits).toBe(inputUpperBound * 3 + 15);
  });

  it('reduces the provider output ceiling to the atomically granted credits', async () => {
    const reservationId = randomUUID();
    reserveCredits.execute.mockImplementation(async (command) => ({
      id: reservationId,
      credits: command.minimumCredits + 1_485,
    }));

    await expect(service.reserve(model, request)).resolves.toEqual({
      reservationId,
      maxOutputTokens: 100,
    });
  });

  it('does not authorize more output than the selected model supports', async () => {
    const reservationId = randomUUID();
    const gpt4o = new LanguageModelEntity({
      name: 'gpt-4o',
      provider: ModelProvider.OPENAI,
      displayName: 'GPT-4o',
      canStream: true,
      canUseTools: true,
      isReasoning: false,
      canVision: true,
      isArchived: false,
      inputTokenCost: 2.5,
      outputTokenCost: 10,
    });
    reserveCredits.execute.mockImplementation(async (command) => ({
      id: reservationId,
      credits: command.requestedCredits,
    }));

    const authorization = await service.reserve(gpt4o, request);

    expect(authorization).toEqual({
      reservationId,
      maxOutputTokens: 16_384,
    });
  });

  it('releases the reservation after the model call is accounted', async () => {
    const reservationId = randomUUID();

    await service.release(reservationId);

    expect(releaseReservation.execute).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId }),
    );
  });
});
