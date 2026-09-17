import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  InvalidCreditLimitError,
  UnexpectedCreditLimitError,
  UserCreditLimitExceededError,
} from 'src/iam/credit-limits/application/credit-limits.errors';
import {
  type PersonalCreditReservation,
  PersonalCreditReservationRepository,
} from 'src/iam/credit-limits/application/ports/personal-credit-reservation.repository';
import { ReservePersonalCreditsCommand } from './reserve-personal-credits.command';

const RESERVATION_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class ReservePersonalCreditsUseCase {
  private readonly logger = new Logger(ReservePersonalCreditsUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly repository: PersonalCreditReservationRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(
    command: ReservePersonalCreditsCommand,
  ): Promise<PersonalCreditReservation | null> {
    const orgId = this.contextService.get('orgId');
    const userId = this.contextService.get('userId');
    if (!orgId || !userId) throw new UnauthorizedAccessError();
    this.validate(command);
    this.logger.debug({ orgId, userId }, 'Reserving personal credits');

    const now = new Date();
    const result = await this.repository.reserve({
      orgId,
      userId,
      requestedCredits: command.requestedCredits,
      minimumCredits: command.minimumCredits,
      monthStart: new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      ),
      now,
      expiresAt: new Date(now.getTime() + RESERVATION_TTL_MS),
    });
    if (result.status === 'unlimited') return null;
    if (result.status === 'reserved') return result.reservation;
    throw new UserCreditLimitExceededError({
      userId,
      creditsUsed: result.creditsUsed + result.reservedCredits,
      limit: result.limit,
    });
  }

  private validate(command: ReservePersonalCreditsCommand): void {
    if (
      !Number.isFinite(command.requestedCredits) ||
      !Number.isFinite(command.minimumCredits) ||
      command.minimumCredits <= 0 ||
      command.requestedCredits < command.minimumCredits
    ) {
      throw new InvalidCreditLimitError('Invalid personal credit reservation');
    }
  }
}
