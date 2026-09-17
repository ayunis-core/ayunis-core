import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { PersonalCreditReservationRepository } from 'src/iam/credit-limits/application/ports/personal-credit-reservation.repository';
import { UserCreditLimitExceededError } from 'src/iam/credit-limits/application/credit-limits.errors';
import { ReservePersonalCreditsCommand } from './reserve-personal-credits.command';
import { ReservePersonalCreditsUseCase } from './reserve-personal-credits.use-case';

describe('ReservePersonalCreditsUseCase', () => {
  const orgId = randomUUID();
  const userId = randomUUID();
  let contextService: jest.Mocked<ContextService>;
  let repository: jest.Mocked<PersonalCreditReservationRepository>;
  let useCase: ReservePersonalCreditsUseCase;

  beforeEach(() => {
    contextService = {
      get: jest.fn((key: string) => (key === 'orgId' ? orgId : userId)),
    } as unknown as jest.Mocked<ContextService>;
    repository = {
      reserve: jest.fn(),
      release: jest.fn(),
    };
    useCase = new ReservePersonalCreditsUseCase(contextService, repository);
  });

  it('returns null when the user has no personal credit limit', async () => {
    repository.reserve.mockResolvedValue({ status: 'unlimited' });

    await expect(
      useCase.execute(new ReservePersonalCreditsCommand(500, 100)),
    ).resolves.toBeNull();
  });

  it('returns the atomically persisted reservation', async () => {
    const reservation = { id: randomUUID(), credits: 500 };
    repository.reserve.mockResolvedValue({ status: 'reserved', reservation });

    await expect(
      useCase.execute(new ReservePersonalCreditsCommand(500, 100)),
    ).resolves.toEqual(reservation);
  });

  it('rejects a call whose minimum cost exceeds the available credits', async () => {
    repository.reserve.mockResolvedValue({
      status: 'insufficient',
      creditsUsed: 950,
      reservedCredits: 25,
      limit: 1000,
    });

    await expect(
      useCase.execute(new ReservePersonalCreditsCommand(500, 100)),
    ).rejects.toMatchObject({
      constructor: UserCreditLimitExceededError,
      metadata: { userId, creditsUsed: 975, limit: 1000 },
    });
  });
});
