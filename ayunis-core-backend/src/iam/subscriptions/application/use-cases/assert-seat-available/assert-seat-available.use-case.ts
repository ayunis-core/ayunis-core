import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { CountPendingInvitesByOrgIdQuery } from 'src/iam/invites/application/use-cases/count-pending-invites-by-org-id/count-pending-invites-by-org-id.query';
import { CountPendingInvitesByOrgIdUseCase } from 'src/iam/invites/application/use-cases/count-pending-invites-by-org-id/count-pending-invites-by-org-id.use-case';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import {
  InsufficientSeatsError,
  MultipleActiveSubscriptionsError,
  UnexpectedSeatAdmissionError,
} from 'src/iam/subscriptions/application/subscription.errors';
import { AssertSeatAvailableCommand } from 'src/iam/subscriptions/application/use-cases/assert-seat-available/assert-seat-available.command';
import { isSeatBased } from 'src/iam/subscriptions/domain/subscription-type-guards';
import { CountUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/count-users-by-org-id/count-users-by-org-id.query';
import { CountUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/count-users-by-org-id/count-users-by-org-id.use-case';
import { isActive } from 'src/iam/subscriptions/application/util/is-active';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';

@Injectable()
export class AssertSeatAvailableUseCase {
  private readonly logger = new Logger(AssertSeatAvailableUseCase.name);

  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly acquireAllocationLock: AcquireSeatAllocationLockUseCase,
    private readonly countUsers: CountUsersByOrgIdUseCase,
    private readonly countInvites: CountPendingInvitesByOrgIdUseCase,
    private readonly config: ConfigService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSeatAdmissionError)
  async execute(command: AssertSeatAvailableCommand): Promise<void> {
    this.logger.log(
      { orgId: command.orgId },
      'Checking organization seat admission',
    );
    if (!this.config.get<boolean>('app.isCloudHosted', false)) {
      return;
    }
    await this.checkCloudSeat(command);
  }

  @Transactional()
  private async checkCloudSeat(
    command: AssertSeatAvailableCommand,
  ): Promise<void> {
    await this.acquireAllocationLock.execute(command.orgId);
    const active = (await this.subscriptions.findByOrgId(command.orgId)).filter(
      isActive,
    );
    if (active.length > 1) {
      throw new MultipleActiveSubscriptionsError(command.orgId);
    }
    if (active.length === 0) {
      return;
    }
    const subscription = active[0];
    if (!isSeatBased(subscription)) {
      return;
    }
    const users = await this.countUsers.execute(
      new CountUsersByOrgIdQuery(command.orgId),
    );
    const invites = await this.countInvites.execute(
      new CountPendingInvitesByOrgIdQuery(command.orgId),
    );
    const availableSeats = subscription.noOfSeats - users - invites;
    if (availableSeats < 1) {
      throw new InsufficientSeatsError(1, availableSeats);
    }
  }
}
