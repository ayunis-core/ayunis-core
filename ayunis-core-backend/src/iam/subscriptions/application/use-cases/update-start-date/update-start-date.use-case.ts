import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { isSeatBased } from 'src/iam/subscriptions/domain/subscription-type-guards';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import {
  SubscriptionAlreadyCancelledError,
  SubscriptionAccessOverlapError,
  SubscriptionNotFoundError,
  UnexpectedSubscriptionError,
} from 'src/iam/subscriptions/application/subscription.errors';
import { validateSubscriptionAccess } from 'src/iam/subscriptions/application/util/validate-subscription-access';
import { UpdateStartDateCommand } from './update-start-date.command';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import { accessPeriodsOverlap } from 'src/iam/subscriptions/application/util/access-periods-overlap';
import { getEffectiveAccessEnd } from 'src/iam/subscriptions/application/util/get-effective-access-end';

@Injectable()
export class UpdateStartDateUseCase {
  private readonly logger = new Logger(UpdateStartDateUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly contextService: ContextService,
    private readonly acquireAllocationLock: AcquireSeatAllocationLockUseCase,
  ) {}

  @Transactional()
  async execute(command: UpdateStartDateCommand): Promise<Subscription> {
    this.logger.log(
      {
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
        startsAt: command.startsAt.toISOString(),
      },
      'Updating subscription start date',
    );

    try {
      validateSubscriptionAccess(
        this.contextService,
        command.requestingUserId,
        command.orgId,
      );

      await this.acquireAllocationLock.execute(command.orgId);
      const subscription = await this.subscriptionRepository.findLatestByOrgId(
        command.orgId,
      );
      if (!subscription) {
        throw new SubscriptionNotFoundError(command.orgId);
      }

      if (subscription.cancelledAt) {
        throw new SubscriptionAlreadyCancelledError(command.orgId);
      }
      await this.ensureNoAccessOverlap(subscription, command.startsAt);

      return await this.subscriptionRepository.updateStartDate({
        subscriptionId: subscription.id,
        startsAt: command.startsAt,
        renewalCycleAnchor: isSeatBased(subscription)
          ? command.startsAt
          : undefined,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error(
        { err: error as Error, orgId: command.orgId },
        'Error updating subscription start date',
      );
      throw new UnexpectedSubscriptionError(
        'Unexpected error during subscription start date update',
        { error },
      );
    }
  }

  private async ensureNoAccessOverlap(
    candidate: Subscription,
    startsAt: Date,
  ): Promise<void> {
    const subscriptions = await this.subscriptionRepository.findByOrgId(
      candidate.orgId,
    );
    const overlaps = subscriptions
      .filter(({ id }) => id !== candidate.id)
      .some((subscription) =>
        accessPeriodsOverlap(
          { startsAt, accessEndsAt: getEffectiveAccessEnd(candidate) },
          {
            startsAt: subscription.startsAt,
            accessEndsAt: getEffectiveAccessEnd(subscription),
          },
        ),
      );
    if (overlaps) {
      throw new SubscriptionAccessOverlapError(candidate.orgId);
    }
  }
}
