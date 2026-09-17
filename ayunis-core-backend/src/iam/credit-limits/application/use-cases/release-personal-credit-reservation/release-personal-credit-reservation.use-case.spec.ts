import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { PersonalCreditReservationRepository } from 'src/iam/credit-limits/application/ports/personal-credit-reservation.repository';
import { ReleasePersonalCreditReservationCommand } from './release-personal-credit-reservation.command';
import { ReleasePersonalCreditReservationUseCase } from './release-personal-credit-reservation.use-case';

describe('ReleasePersonalCreditReservationUseCase', () => {
  it('releases only the current user reservation', async () => {
    const orgId = randomUUID();
    const userId = randomUUID();
    const reservationId = randomUUID();
    const contextService = {
      get: jest.fn((key: string) => (key === 'orgId' ? orgId : userId)),
    } as unknown as jest.Mocked<ContextService>;
    const repository = {
      reserve: jest.fn(),
      release: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PersonalCreditReservationRepository>;
    const useCase = new ReleasePersonalCreditReservationUseCase(
      contextService,
      repository,
    );

    await useCase.execute(
      new ReleasePersonalCreditReservationCommand(reservationId),
    );

    expect(repository.release).toHaveBeenCalledWith({
      reservationId,
      orgId,
      userId,
    });
  });
});
