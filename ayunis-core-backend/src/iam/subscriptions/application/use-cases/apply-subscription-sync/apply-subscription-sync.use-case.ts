import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { PendingDomainEvent } from 'src/common/events/pending-domain-event';
import type {
  SubscriptionSyncState,
  SubscriptionSyncData,
} from 'src/iam/subscriptions/application/models/subscription-sync-state';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import { SubscriptionFactory } from 'src/iam/subscriptions/application/services/subscription-factory.service';
import {
  subscriptionSyncSignature,
  cloneSubscriptionWithType,
  hasUnendedAccessPeriod,
  selectSyncSubscription,
  endSynchronizedAccess,
} from 'src/iam/subscriptions/application/services/subscription-sync-data';
import {
  subscriptionSyncEvents,
  subscriptionBillingSyncEvent,
} from 'src/iam/subscriptions/application/services/subscription-sync-events';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import {
  SubscriptionAccessOverlapError,
  MultipleActiveSubscriptionsError,
  UnexpectedSubscriptionError,
} from 'src/iam/subscriptions/application/subscription.errors';
import { getEffectiveAccessEnd } from 'src/iam/subscriptions/application/util/get-effective-access-end';
import { isActive } from 'src/iam/subscriptions/application/util/is-active';
import { accessPeriodsOverlap } from 'src/iam/subscriptions/application/util/access-periods-overlap';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { OldSubscriptionDisposition } from 'src/iam/subscriptions/domain/value-objects/old-subscription-disposition.enum';
import { isSeatBased } from 'src/iam/subscriptions/domain/subscription-type-guards';

export interface ApplySubscriptionSyncResult {
  changed: boolean;
  subscription: Subscription | null;
  events: PendingDomainEvent[];
}

@Injectable()
export class ApplySubscriptionSyncUseCase {
  private readonly logger = new Logger(ApplySubscriptionSyncUseCase.name);

  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly factory: SubscriptionFactory,
    private readonly allocationLock: AcquireSeatAllocationLockUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSubscriptionError)
  @Transactional()
  async execute(
    state: Pick<SubscriptionSyncState, 'orgId' | 'subscription'>,
  ): Promise<ApplySubscriptionSyncResult> {
    this.logger.log(
      { orgId: state.orgId },
      'Applying synchronized subscription state',
    );
    await this.allocationLock.execute(state.orgId);
    const all = await this.subscriptions.findByOrgId(state.orgId);
    if (all.filter(isActive).length > 1)
      throw new MultipleActiveSubscriptionsError(state.orgId);
    if (!state.subscription) {
      const open = all.filter(hasUnendedAccessPeriod);
      const events = await this.endSubscriptions(open);
      return { changed: open.length > 0, subscription: null, events };
    }
    return this.applyState(state.orgId, state.subscription, all);
  }

  private async applyState(
    orgId: UUID,
    data: SubscriptionSyncData,
    all: Subscription[],
  ): Promise<ApplySubscriptionSyncResult> {
    const current = selectSyncSubscription(all, data);
    const superseded = all.filter(
      (entry) =>
        entry.id !== current?.id &&
        entry.startsAt > new Date() &&
        hasUnendedAccessPeriod(entry),
    );
    const retired = new Map(
      superseded.map((entry) => [entry.id, endSynchronizedAccess(entry)]),
    );
    const projected = all.map((entry) => retired.get(entry.id) ?? entry);
    const applied = await this.applyActive(orgId, data, current, projected);
    const events = await this.endSubscriptions(superseded);
    return {
      ...applied,
      changed: applied.changed || superseded.length > 0,
      events: [...events, ...applied.events],
    };
  }

  private async applyActive(
    orgId: UUID,
    data: SubscriptionSyncData,
    current: Subscription | null,
    all: Subscription[],
  ): Promise<ApplySubscriptionSyncResult> {
    const replace = current !== null && this.needsReplacement(current, data);
    const startsAt = this.startBoundary(data.startsAt, current, all, replace);
    const candidate = await this.buildCandidate(
      orgId,
      data,
      current,
      startsAt,
      replace,
    );
    if (current && !replace) this.keepIdentity(current, candidate);
    this.assertNoOverlap(candidate, current, all);
    if (
      current &&
      !replace &&
      subscriptionSyncSignature(current) ===
        subscriptionSyncSignature(candidate)
    ) {
      return { changed: false, subscription: current, events: [] };
    }
    if (!current) {
      const saved = await this.subscriptions.create(candidate);
      return {
        changed: true,
        subscription: saved,
        events: subscriptionSyncEvents(null, saved, true),
      };
    }
    if (replace) return this.replace(current, candidate);
    return this.update(current, candidate);
  }

  private async buildCandidate(
    orgId: UUID,
    data: SubscriptionSyncData,
    current: Subscription | null,
    startsAt: Date,
    replace: boolean,
  ): Promise<Subscription> {
    const candidate = await this.factory.build(
      {
        ...data.billingInfo,
        orgId,
        type: data.type,
        noOfSeats: data.noOfSeats,
        monthlyCredits: data.monthlyCredits,
        startsAt,
      },
      current && !replace && hasUnendedAccessPeriod(current)
        ? current
        : undefined,
    );
    candidate.cancelledAt = data.cancelledAt;
    candidate.accessEndsAt = data.accessEndsAt;
    if (isSeatBased(candidate)) candidate.renewalCycleAnchor = data.startsAt;
    return candidate;
  }

  private async update(
    current: Subscription,
    candidate: Subscription,
  ): Promise<ApplySubscriptionSyncResult> {
    candidate.updatedAt = new Date();
    const saved = await this.subscriptions.update(candidate);
    const events = subscriptionSyncEvents(current, saved, false);
    if (this.billingChanged(current, saved))
      events.push(subscriptionBillingSyncEvent(saved));
    return { changed: true, subscription: saved, events };
  }

  private needsReplacement(
    current: Subscription,
    data: SubscriptionSyncData,
  ): boolean {
    const end = getEffectiveAccessEnd(current);
    return (
      current.type !== data.type ||
      (data.startsAt > new Date() && current.startsAt < data.startsAt) ||
      (end !== null && end <= new Date() && data.startsAt >= end)
    );
  }

  private startBoundary(
    remoteStart: Date,
    current: Subscription | null,
    all: Subscription[],
    replace: boolean,
  ): Date {
    const boundaries = all
      .filter((entry) => entry.id !== current?.id)
      .filter((entry) => {
        const end = getEffectiveAccessEnd(entry);
        return end !== null && end > entry.startsAt;
      })
      .map(getEffectiveAccessEnd)
      .filter((end): end is Date => end !== null && end <= new Date());
    if (replace && current)
      boundaries.push(
        new Date(
          Math.min(
            getEffectiveAccessEnd(current)?.getTime() ?? Date.now(),
            Date.now(),
          ),
        ),
      );
    return new Date(
      Math.max(
        remoteStart.getTime(),
        ...boundaries.map((end) => end.getTime()),
      ),
    );
  }

  private keepIdentity(current: Subscription, candidate: Subscription): void {
    candidate.id = current.id;
    candidate.createdAt = current.createdAt;
    candidate.billingInfo.id = current.billingInfo.id;
    candidate.billingInfo.createdAt = current.billingInfo.createdAt;
    if (isSeatBased(current) && isSeatBased(candidate)) {
      candidate.pricePerSeat = current.pricePerSeat;
    }
  }

  private assertNoOverlap(
    candidate: Subscription,
    current: Subscription | null,
    all: Subscription[],
  ): void {
    if (
      all.some(
        (entry) =>
          entry.id !== current?.id &&
          accessPeriodsOverlap(candidate, {
            startsAt: entry.startsAt,
            accessEndsAt: getEffectiveAccessEnd(entry),
          }),
      )
    ) {
      throw new SubscriptionAccessOverlapError(candidate.orgId);
    }
  }

  private async replace(
    current: Subscription,
    candidate: Subscription,
  ): Promise<ApplySubscriptionSyncResult> {
    const existingEnd = getEffectiveAccessEnd(current);
    const replacementBoundary =
      current.startsAt > new Date() ? new Date() : candidate.startsAt;
    const oldAccessEndsAt =
      existingEnd && existingEnd < replacementBoundary
        ? existingEnd
        : replacementBoundary;
    const saved = await this.subscriptions.replace({
      oldSubscriptionId: current.id,
      disposition: OldSubscriptionDisposition.CANCEL,
      oldAccessEndsAt,
      oldCancelledAt: current.cancelledAt,
      newSubscription: candidate,
    });
    const ended = cloneSubscriptionWithType(current);
    ended.accessEndsAt = oldAccessEndsAt;
    ended.cancelledAt ??= new Date();
    const events = [
      ...subscriptionSyncEvents(current, ended, false),
      ...subscriptionSyncEvents(null, saved, true),
    ];
    return { changed: true, subscription: saved, events };
  }

  private async endSubscriptions(
    subscriptions: Subscription[],
  ): Promise<PendingDomainEvent[]> {
    const events: PendingDomainEvent[] = [];
    for (const previous of subscriptions) {
      const saved = await this.subscriptions.update(
        endSynchronizedAccess(previous),
      );
      events.push(...subscriptionSyncEvents(previous, saved, false));
    }
    return events;
  }

  private billingChanged(previous: Subscription, next: Subscription): boolean {
    const fields = [
      'companyName',
      'street',
      'houseNumber',
      'postalCode',
      'city',
      'country',
      'vatNumber',
      'subText',
    ] as const;
    return fields.some(
      (field) => previous.billingInfo[field] !== next.billingInfo[field],
    );
  }
}
