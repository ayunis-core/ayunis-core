import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedCreditLimitError } from 'src/iam/credit-limits/application/credit-limits.errors';
import { PersonalCreditReservationRepository } from 'src/iam/credit-limits/application/ports/personal-credit-reservation.repository';
import { ReleasePersonalCreditReservationCommand } from './release-personal-credit-reservation.command';

@Injectable()
export class ReleasePersonalCreditReservationUseCase {
  private readonly logger = new Logger(
    ReleasePersonalCreditReservationUseCase.name,
  );

  constructor(
    private readonly contextService: ContextService,
    private readonly repository: PersonalCreditReservationRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(
    command: ReleasePersonalCreditReservationCommand,
  ): Promise<void> {
    const orgId = this.contextService.get('orgId');
    const userId = this.contextService.get('userId');
    if (!orgId || !userId) throw new UnauthorizedAccessError();
    this.logger.debug(
      { reservationId: command.reservationId },
      'Releasing personal credit reservation',
    );
    await this.repository.release({
      reservationId: command.reservationId,
      orgId,
      userId,
    });
  }
}
