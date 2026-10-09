import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { isSuperAdmin } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import {
  InvalidSubscriptionDataError,
  UnauthorizedSubscriptionAccessError,
  UnexpectedSubscriptionError,
} from 'src/iam/subscriptions/application/subscription.errors';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import { isActive } from 'src/iam/subscriptions/application/util/is-active';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { ResolveSubscriptionOverlapCommand } from './resolve-subscription-overlap.command';

@Injectable()
export class ResolveSubscriptionOverlapUseCase {
  private readonly logger = new Logger(ResolveSubscriptionOverlapUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly acquireAllocationLock: AcquireSeatAllocationLockUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSubscriptionError)
  @Transactional()
  async execute(command: ResolveSubscriptionOverlapCommand): Promise<void> {
    this.assertSuperAdmin(command.requestingUserId, command.orgId);
    await this.acquireAllocationLock.execute(command.orgId);

    const subscriptions = await this.subscriptionRepository.findByOrgId(
      command.orgId,
    );
    const serving = subscriptions.filter(isActive);
    const adjustments = this.validateAndApply(command, serving);

    await this.subscriptionRepository.applyAccessEndAdjustments({
      orgId: command.orgId,
      requestingUserId: command.requestingUserId,
      reason: command.reason.trim(),
      adjustments,
    });

    this.logger.log(
      {
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
        authoritativeSubscriptionId: command.authoritativeSubscriptionId,
        adjustedSubscriptionIds: adjustments.map(
          ({ subscription }) => subscription.id,
        ),
        reason: command.reason.trim(),
      },
      'Resolved overlapping subscriptions',
    );
  }

  private validateAndApply(
    command: ResolveSubscriptionOverlapCommand,
    serving: Subscription[],
  ): Array<{
    subscription: Subscription;
    previousAccessEndsAt: Date | null;
  }> {
    if (serving.length < 2) {
      throw new InvalidSubscriptionDataError(
        'At least two serving subscriptions are required',
      );
    }

    const authoritative = serving.find(
      ({ id }) => id === command.authoritativeSubscriptionId,
    );
    if (!authoritative) {
      throw new InvalidSubscriptionDataError(
        'The authoritative subscription must currently be serving',
      );
    }

    const conflicting = serving.filter(({ id }) => id !== authoritative.id);
    this.assertAdjustmentSet(command, conflicting);

    const byId = new Map(
      conflicting.map((subscription) => [subscription.id, subscription]),
    );
    const correctedAt = new Date();
    return command.adjustments.map((adjustment) => {
      const subscription = byId.get(adjustment.subscriptionId)!;
      this.assertValidAccessEnd(subscription, adjustment.accessEndsAt);
      const previousAccessEndsAt = subscription.accessEndsAt;
      subscription.accessEndsAt = adjustment.accessEndsAt;
      // An ended subscription no longer renews. Readers that still key on
      // cancelledAt (user export) must not treat it as current.
      subscription.cancelledAt ??= correctedAt;
      return { subscription, previousAccessEndsAt };
    });
  }

  private assertAdjustmentSet(
    command: ResolveSubscriptionOverlapCommand,
    conflicting: Subscription[],
  ): void {
    const ids = command.adjustments.map(({ subscriptionId }) => subscriptionId);
    const uniqueIds = new Set(ids);
    const conflictingIds = new Set(conflicting.map(({ id }) => id));
    if (
      uniqueIds.size !== ids.length ||
      uniqueIds.size !== conflictingIds.size ||
      [...uniqueIds].some((id) => !conflictingIds.has(id))
    ) {
      throw new InvalidSubscriptionDataError(
        'Every conflicting subscription must have exactly one access end adjustment',
      );
    }
    if (!command.reason.trim()) {
      throw new InvalidSubscriptionDataError('A correction reason is required');
    }
  }

  private assertValidAccessEnd(
    subscription: Subscription,
    accessEndsAt: Date,
  ): void {
    if (
      Number.isNaN(accessEndsAt.getTime()) ||
      accessEndsAt < subscription.startsAt ||
      accessEndsAt > new Date()
    ) {
      throw new InvalidSubscriptionDataError(
        'Access end must be between the subscription start and now',
      );
    }
  }

  private assertSuperAdmin(requestingUserId: UUID, orgId: UUID): void {
    if (!isSuperAdmin(this.contextService)) {
      throw new UnauthorizedSubscriptionAccessError(requestingUserId, orgId);
    }
  }
}
