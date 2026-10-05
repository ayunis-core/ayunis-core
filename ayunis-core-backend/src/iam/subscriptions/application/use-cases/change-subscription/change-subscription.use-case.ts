import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChangeSubscriptionCommand } from './change-subscription.command';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { OldSubscriptionDisposition } from 'src/iam/subscriptions/domain/value-objects/old-subscription-disposition.enum';
import {
  SubscriptionAccessOverlapError,
  UnexpectedSubscriptionError,
} from 'src/iam/subscriptions/application/subscription.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { SubscriptionCreatedEvent } from 'src/iam/subscriptions/application/events/subscription-created.event';
import { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import { toSubscriptionEventData } from 'src/iam/subscriptions/application/mappers/to-subscription-event-data.mapper';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from 'src/iam/subscriptions/application/util/validate-subscription-access';
import { SubscriptionFactory } from 'src/iam/subscriptions/application/services/subscription-factory.service';
import { accessPeriodsOverlap } from 'src/iam/subscriptions/application/util/access-periods-overlap';
import { getEffectiveAccessEnd } from 'src/iam/subscriptions/application/util/get-effective-access-end';
import { selectManageableSubscription } from 'src/iam/subscriptions/application/util/find-manageable-subscription';
import { isActive } from 'src/iam/subscriptions/application/util/is-active';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';

@Injectable()
export class ChangeSubscriptionUseCase {
  private readonly logger = new Logger(ChangeSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionFactory: SubscriptionFactory,
    private readonly eventEmitter: EventEmitter2,
    private readonly contextService: ContextService,
    private readonly acquireAllocationLock: AcquireSeatAllocationLockUseCase,
  ) {}

  @Transactional()
  async execute(command: ChangeSubscriptionCommand): Promise<Subscription> {
    this.logger.log(
      {
        orgId: command.orgId,
        type: command.type,
        disposition: command.disposition,
      },
      'Changing subscription',
    );

    try {
      return await this.change(command);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          orgId: command.orgId,
          requestingUserId: command.requestingUserId,
        },
        'Subscription change failed',
      );
      throw new UnexpectedSubscriptionError(
        'Unexpected error during subscription change',
        { error: error as Error },
      );
    }
  }

  private async change(
    command: ChangeSubscriptionCommand,
  ): Promise<Subscription> {
    validateSubscriptionAccess(
      this.contextService,
      command.requestingUserId,
      command.orgId,
    );
    await this.acquireAllocationLock.execute(command.orgId);
    const { current, subscriptions } = await this.findReplaceableSubscription(
      command.orgId,
    );
    const newSubscription = await this.subscriptionFactory.build(command);
    this.assertNoOtherAccessOverlap(current, newSubscription, subscriptions);

    const currentAccessEndsAt = getEffectiveAccessEnd(current);
    const oldAccessEndsAt =
      command.disposition === OldSubscriptionDisposition.CANCEL
        ? this.earlierDate(currentAccessEndsAt, newSubscription.startsAt)
        : null;
    const created = await this.subscriptionRepository.replace({
      oldSubscriptionId: current.id,
      disposition: command.disposition,
      oldAccessEndsAt,
      oldCancelledAt: current.cancelledAt,
      newSubscription,
    });

    if (
      command.disposition === OldSubscriptionDisposition.CANCEL &&
      !current.cancelledAt
    ) {
      current.cancelledAt = new Date();
    }
    current.accessEndsAt = oldAccessEndsAt;
    this.emitEvents(command, current, created);
    return created;
  }

  private async findReplaceableSubscription(
    orgId: Subscription['orgId'],
  ): Promise<{ current: Subscription; subscriptions: Subscription[] }> {
    const subscriptions = await this.subscriptionRepository.findByOrgId(orgId);
    const current = selectManageableSubscription(subscriptions, orgId, true);
    return { current, subscriptions };
  }

  private assertNoOtherAccessOverlap(
    current: Subscription,
    candidate: Subscription,
    subscriptions: Subscription[],
  ): void {
    const overlaps = subscriptions.some(
      (subscription) =>
        subscription.id !== current.id &&
        accessPeriodsOverlap(
          {
            startsAt: subscription.startsAt,
            accessEndsAt: getEffectiveAccessEnd(subscription),
          },
          candidate,
        ),
    );
    if (overlaps) {
      throw new SubscriptionAccessOverlapError(candidate.orgId);
    }
  }

  private earlierDate(left: Date | null, right: Date): Date {
    return left && left < right ? left : right;
  }

  private emitEvents(
    command: ChangeSubscriptionCommand,
    oldSubscription: Subscription,
    newSubscription: Subscription,
  ): void {
    if (
      command.disposition === OldSubscriptionDisposition.CANCEL &&
      !isActive(oldSubscription)
    ) {
      this.safeEmit(
        SubscriptionCancelledEvent.EVENT_NAME,
        new SubscriptionCancelledEvent(
          command.orgId,
          toSubscriptionEventData(oldSubscription),
        ),
      );
    }
    this.safeEmit(
      SubscriptionCreatedEvent.EVENT_NAME,
      new SubscriptionCreatedEvent(
        command.orgId,
        toSubscriptionEventData(newSubscription),
      ),
    );
  }

  private safeEmit(eventName: string, event: object): void {
    this.eventEmitter.emitAsync(eventName, event).catch((err: unknown) => {
      this.logger.error(
        { err: err as Error, eventName },
        'Failed to emit subscription event',
      );
    });
  }
}
