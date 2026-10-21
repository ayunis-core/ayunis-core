import { Logger } from '@nestjs/common';
import { FynnResourceNotFoundError } from 'src/integrations/fynn/application/fynn.errors';
import type { DeliverBillingWebhookUseCase } from 'src/integrations/webhooks/application/use-cases/deliver-billing-webhook/deliver-billing-webhook.use-case';
import type { FynnOutbox } from 'src/integrations/fynn/application/ports/fynn-outbox';
import type { PendingDomainEvent } from 'src/common/events/pending-domain-event';
import type { FynnOrgLinkRepository } from 'src/integrations/fynn/application/ports/fynn-org-link.repository';
import { FynnSyncEventsService } from 'src/integrations/fynn/application/services/fynn-sync-events.service';
import type { RevokeUnlinkedFynnAccessUseCase } from 'src/integrations/fynn/application/use-cases/revoke-unlinked-fynn-access/revoke-unlinked-fynn-access.use-case';
import type { SubscriptionSyncState } from 'src/iam/subscriptions/application/models/subscription-sync-state';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { FynnSnapshot } from 'src/integrations/fynn/application/models/fynn-snapshot';
import type { FynnClient } from 'src/integrations/fynn/application/ports/fynn-client';
import { LoadFynnSnapshotService } from 'src/integrations/fynn/application/services/load-fynn-snapshot.service';
import type { ApplySubscriptionSyncUseCase } from 'src/iam/subscriptions/application/use-cases/apply-subscription-sync/apply-subscription-sync.use-case';
import type { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import type { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import type { EndTrialUseCase } from 'src/iam/trials/application/use-cases/end-trial/end-trial.use-case';
import type { SyncAcademyAddonUseCase } from 'src/iam/addons/application/use-cases/sync-academy-addon/sync-academy-addon.use-case';
import { SyncFynnSubscriptionUseCase } from './sync-fynn-subscription.use-case';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));
const fixtures = JSON.parse(
  readFileSync(
    join(__dirname, '../../services/fixtures/preview-cases.json'),
    'utf8',
  ),
) as FynnSnapshot[];

describe('Fynn synchronization orchestration', () => {
  let snapshot: FynnSnapshot;
  let client: FynnClient;
  let applied: unknown[];
  let trialEnded: boolean;
  let academyActive: boolean;
  let locked: boolean;
  let events: EventEmitter2;
  let queued: PendingDomainEvent[];
  let useCase: SyncFynnSubscriptionUseCase;
  function setup(cloud = true, enabled = true) {
    const apply = {
      execute: async (state: SubscriptionSyncState) => {
        applied.push(state);
        return {
          changed: true,
          subscription: state.subscription
            ? new UsageBasedSubscription({
                orgId: state.orgId,
                startsAt: state.subscription.startsAt,
                monthlyCredits: state.subscription.monthlyCredits ?? 0,
                billingInfo: new SubscriptionBillingInfo(
                  state.subscription.billingInfo,
                ),
              })
            : null,
          events: [{ name: 'subscription.created', event: {} }],
        };
      },
    } as unknown as ApplySubscriptionSyncUseCase;
    useCase = new SyncFynnSubscriptionUseCase(
      new ConfigService({
        app: { isCloudHosted: cloud },
        features: { fynnManagedSubscriptionsEnabled: enabled },
      }),
      client,
      new LoadFynnSnapshotService(client),
      {
        execute: async () => {
          locked = true;
        },
      } as unknown as AcquireSeatAllocationLockUseCase,
      {
        execute: async () => ({ id: '00000000-0000-4000-8000-000000000003' }),
      } as unknown as FindOrgByIdUseCase,
      apply,
      {
        execute: async () => {
          trialEnded = true;
          return true;
        },
      } as unknown as EndTrialUseCase,
      {
        execute: async ({ active }: { active: boolean }) => {
          academyActive = active;
          return [];
        },
      } as unknown as SyncAcademyAddonUseCase,
      new FynnSyncEventsService(
        events,
        {
          append: async (_orgId: string, pending: PendingDomainEvent[]) => {
            queued.push(...pending);
          },
        } as unknown as FynnOutbox,
        { execute: async () => {} } as unknown as DeliverBillingWebhookUseCase,
      ),
      { save: async () => {} } as unknown as FynnOrgLinkRepository,
      {
        execute: async () => ({ failed: 0 }),
      } as unknown as RevokeUnlinkedFynnAccessUseCase,
      {
        observe: async () => '00000000-0000-4000-8000-000000000001',
        begin: async () => '00000000-0000-4000-8000-000000000001',
        isCurrent: async () => true,
      },
    );
  }
  beforeEach(() => {
    snapshot = structuredClone(fixtures[2]);
    applied = [];
    queued = [];
    trialEnded = false;
    academyActive = false;
    locked = false;
    events = new EventEmitter2();
    client = {
      getSubscription: async () => structuredClone(snapshot.subscription),
      getCustomer: async () => structuredClone(snapshot.customer),
      listCustomerLinks: async () => [snapshot.customer],
      listSubscriptions: async () => [snapshot.subscription],
      getEntitlements: async () => snapshot.entitlements,
    };
    setup();
  });
  it('performs provider discovery before acquiring the seat allocation lock', async () => {
    const original = client.getEntitlements.bind(client);
    client.getEntitlements = async (...args) => {
      expect(locked).toBe(false);
      return original(...args);
    };
    await useCase.execute({ subscriptionId: snapshot.subscription.id });
  });
  it('rejects stale prepared snapshots when another synchronization supersedes them', async () => {
    Object.assign(useCase, {
      revisions: {
        observe: async () => 'revision',
        begin: async () => 'revision',
        isCurrent: async () => false,
      },
    });
    await expect(
      useCase.execute({ subscriptionId: snapshot.subscription.id }),
    ).rejects.toThrow();
    expect(applied).toEqual([]);
    expect(queued).toEqual([]);
  });
  it('cleans up a deleted customer using the subscription customer ID', async () => {
    client.getCustomer = async () => {
      throw new FynnResourceNotFoundError();
    };
    Object.assign(useCase, {
      cleanup: { execute: async () => ({ changed: 1, failed: 0 }) },
    });
    await expect(
      useCase.execute({ subscriptionId: snapshot.subscription.id }),
    ).resolves.toEqual({ orgId: null, changed: true });
    expect(applied).toEqual([]);
  });
  it('reports an unassignable subscription without granting access or retrying unlink deliveries', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    snapshot.customer.customFields = {};
    try {
      await expect(
        useCase.execute({
          subscriptionId: snapshot.subscription.id,
          deliveryId: 'missing-link-delivery',
        }),
      ).resolves.toEqual({ orgId: null, changed: false });
      expect(warn).toHaveBeenCalledWith(
        {
          code: 'FYNN_ORG_LINK_MISSING',
          customerId: snapshot.customer.id,
          subscriptionId: snapshot.subscription.id,
          deliveryId: 'missing-link-delivery',
        },
        expect.stringContaining('ayunis-core-uuid'),
      );
      expect(applied).toEqual([]);
      expect(queued).toEqual([]);
    } finally {
      warn.mockRestore();
    }
  });

  it('acknowledges an unlinked subscription after cleaning up its previously synced org', async () => {
    snapshot.customer.customFields = {};
    Object.assign(useCase, {
      cleanup: { execute: async () => ({ changed: 1, failed: 0 }) },
    });
    expect(
      await useCase.execute({ subscriptionId: snapshot.subscription.id }),
    ).toEqual({ orgId: null, changed: true });
    expect(applied).toEqual([]);
    expect(trialEnded).toBe(false);
  });
  it('cleans up the old org even if synchronizing the newly linked org fails', async () => {
    let cleaned = false;
    Object.assign(useCase, {
      cleanup: {
        execute: async () => {
          cleaned = true;
          return { changed: 1, failed: 0 };
        },
      },
      findOrg: {
        execute: async () => {
          throw new Error('new Core org does not exist');
        },
      },
    });
    await expect(
      useCase.execute({ subscriptionId: snapshot.subscription.id }),
    ).rejects.toThrow();
    expect(cleaned).toBe(true);
  });
  it('persists outgoing events and awaits local effects before completing', async () => {
    let delivered = false;
    // EventEmitter2.emitAsync awaits promises despite its void listener type.
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    events.on('subscription.created', async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      delivered = true;
    });
    await useCase.execute({ subscriptionId: snapshot.subscription.id });
    expect(delivered).toBe(true);
    expect(queued).toHaveLength(1);
  });
  it('rejects failed local effects so the state transaction can roll back', async () => {
    // EventEmitter2.emitAsync awaits promises despite its void listener type.
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    events.on('subscription.created', async () => {
      throw new Error('listener unavailable');
    });
    await expect(
      useCase.execute({ subscriptionId: snapshot.subscription.id }),
    ).rejects.toThrow();
    expect(applied).toHaveLength(1);
  });
  it('applies live credits, ends the free trial and enables Academy', async () => {
    const result = await useCase.execute({
      subscriptionId: snapshot.subscription.id,
    });
    expect(applied).toEqual([
      expect.objectContaining({
        subscription: expect.objectContaining({ monthlyCredits: 100_000_000 }),
      }),
    ]);
    expect(result.changed).toBe(true);
    expect(trialEnded).toBe(true);
    expect(academyActive).toBe(true);
  });
  it('loads source state before acquiring the organization lock', async () => {
    client.getEntitlements = async () => {
      expect(locked).toBe(false);
      return snapshot.entitlements;
    };
    await useCase.execute({ subscriptionId: snapshot.subscription.id });
    expect(applied).toHaveLength(1);
  });
  it('rejects active subscriptions on different customers linked to the same org', async () => {
    client.listCustomerLinks = async () => [
      snapshot.customer,
      { ...snapshot.customer, id: 'second-customer' },
    ];
    client.listSubscriptions = async (id) => [
      {
        ...snapshot.subscription,
        id:
          id === snapshot.customer.id
            ? snapshot.subscription.id
            : 'second-subscription',
        customer: { id },
      },
    ];
    await expect(
      useCase.execute({ subscriptionId: snapshot.subscription.id }),
    ).rejects.toThrow();
    expect(applied).toEqual([]);
    expect(trialEnded).toBe(false);
  });
  it('ignores an expired active trial when selecting its active replacement', async () => {
    const expired = structuredClone(snapshot.subscription);
    expired.id = 'expired-trial';
    for (const item of expired.items)
      item.contractDetails.contractEnd = '2020-01-01T00:00:00Z';
    client.listSubscriptions = async () => [expired, snapshot.subscription];
    client.getSubscription = async (id) =>
      id === expired.id ? expired : snapshot.subscription;
    client.getEntitlements = async (id) =>
      id === expired.id ? [] : snapshot.entitlements;
    await useCase.execute({ subscriptionId: expired.id });
    expect(applied).toEqual([
      expect.objectContaining({
        subscription: expect.objectContaining({ monthlyCredits: 100_000_000 }),
      }),
    ]);
  });

  it('does not count a sibling without plan entitlements as a duplicate serving subscription', async () => {
    const sibling = { ...snapshot.subscription, id: 'academy-only-sibling' };
    client.listSubscriptions = async () => [snapshot.subscription, sibling];
    client.getSubscription = async (id) =>
      id === sibling.id ? sibling : snapshot.subscription;
    client.getEntitlements = async (id) =>
      id === sibling.id
        ? snapshot.entitlements.filter(
            (entry) => entry.feature.id === 'core-academy',
          )
        : snapshot.entitlements;
    await useCase.execute({ subscriptionId: snapshot.subscription.id });
    expect(applied).toEqual([
      expect.objectContaining({
        subscription: expect.objectContaining({ monthlyCredits: 100_000_000 }),
      }),
    ]);
  });
  it.each([true, false])(
    'updates a serving plan despite a pending sibling (pending first: %s)',
    async (pendingFirst) => {
      const sibling = { ...snapshot.subscription, id: 'provisioning-sibling' };
      client.listSubscriptions = async () =>
        pendingFirst
          ? [sibling, snapshot.subscription]
          : [snapshot.subscription, sibling];
      client.getSubscription = async (id) =>
        id === sibling.id ? sibling : snapshot.subscription;
      client.getEntitlements = async (id) =>
        id === sibling.id
          ? snapshot.entitlements.map((entry) => ({
              ...entry,
              status: 'pending',
            }))
          : snapshot.entitlements;
      await useCase.execute({ subscriptionId: sibling.id });
      expect(applied).toEqual([
        expect.objectContaining({
          subscription: expect.objectContaining({
            monthlyCredits: 100_000_000,
          }),
        }),
      ]);
    },
  );

  it.each(['academy-only', 'ended-trial'])(
    'preserves access when a %s trigger has a sibling plan still provisioning',
    async (kind) => {
      const trigger = structuredClone(snapshot.subscription);
      trigger.id = 'non-serving-trigger';
      if (kind === 'ended-trial') {
        for (const item of trigger.items)
          item.contractDetails.contractEnd = '2020-01-01T00:00:00Z';
      }
      client.listSubscriptions = async () => [trigger, snapshot.subscription];
      client.getSubscription = async (id) =>
        id === trigger.id ? trigger : snapshot.subscription;
      const triggerEntitlements =
        kind === 'academy-only'
          ? snapshot.entitlements.filter(
              (entry) => entry.feature.id === 'core-academy',
            )
          : [];
      client.getEntitlements = async (id) =>
        id === trigger.id
          ? triggerEntitlements
          : snapshot.entitlements.map((entry) => ({
              ...entry,
              status: 'pending',
            }));
      await expect(
        useCase.execute({ subscriptionId: trigger.id }),
      ).rejects.toThrow();
      expect(applied).toEqual([]);
      expect(trialEnded).toBe(false);
    },
  );

  it('does not change Core when the remote read fails', async () => {
    client.getEntitlements = async () => {
      throw new Error('network unavailable');
    };
    await expect(
      useCase.execute({ subscriptionId: snapshot.subscription.id }),
    ).rejects.toThrow();
    expect(applied).toEqual([]);
  });
  it('does not emit events when a later mutation fails', async () => {
    const emitted: unknown[] = [];
    events.onAny((name) => emitted.push(name));
    const failingAcademy = {
      execute: async () => {
        throw new Error('storage unavailable');
      },
    } as unknown as SyncAcademyAddonUseCase;
    Object.assign(useCase, { academy: failingAcademy });
    await expect(
      useCase.execute({ subscriptionId: snapshot.subscription.id }),
    ).rejects.toThrow();
    expect(emitted).toEqual([]);
  });
  it('ends access and Academy for a terminated subscription without ending a free trial', async () => {
    snapshot.subscription.status = 'terminated';
    await useCase.execute({ subscriptionId: snapshot.subscription.id });
    expect(applied).toEqual([expect.objectContaining({ subscription: null })]);
    expect(trialEnded).toBe(false);
    expect(academyActive).toBe(false);
  });
  it('keeps the free trial until paid access actually starts', async () => {
    snapshot.subscription.contractDetails.contractStart =
      '2099-01-01T00:00:00Z';
    await useCase.execute({ subscriptionId: snapshot.subscription.id });
    expect(trialEnded).toBe(false);
    jest.useFakeTimers().setSystemTime(new Date('2099-01-02T00:00:00Z'));
    try {
      await useCase.execute({ subscriptionId: snapshot.subscription.id });
      expect(trialEnded).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
  it('preserves manual management when the Fynn feature is disabled', async () => {
    const reads = jest.spyOn(client, 'getSubscription');
    setup(true, false);
    await expect(
      useCase.execute({ subscriptionId: snapshot.subscription.id }),
    ).rejects.toThrow();
    expect(reads).not.toHaveBeenCalled();
    expect(applied).toEqual([]);
  });
  it('makes no remote request on self-hosted deployments', async () => {
    const reads = jest.spyOn(client, 'getSubscription');
    setup(false);
    await expect(
      useCase.execute({ subscriptionId: snapshot.subscription.id }),
    ).rejects.toThrow();
    expect(reads).not.toHaveBeenCalled();
  });
});
