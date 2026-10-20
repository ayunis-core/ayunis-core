import { FynnResourceNotFoundError } from 'src/integrations/fynn/application/fynn.errors';
import type { DeliverBillingWebhookUseCase } from 'src/integrations/webhooks/application/use-cases/deliver-billing-webhook/deliver-billing-webhook.use-case';
import type { FynnOutbox } from 'src/integrations/fynn/application/ports/fynn-outbox';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import type { FynnClient } from 'src/integrations/fynn/application/ports/fynn-client';
import type { FynnOrgLinkRepository } from 'src/integrations/fynn/application/ports/fynn-org-link.repository';
import type { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import type { ApplySubscriptionSyncUseCase } from 'src/iam/subscriptions/application/use-cases/apply-subscription-sync/apply-subscription-sync.use-case';
import type { SyncAcademyAddonUseCase } from 'src/iam/addons/application/use-cases/sync-academy-addon/sync-academy-addon.use-case';
import { FynnSyncEventsService } from 'src/integrations/fynn/application/services/fynn-sync-events.service';
import { RevokeUnlinkedFynnAccessUseCase } from './revoke-unlinked-fynn-access.use-case';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));
const orgId: UUID = '00000000-0000-4000-8000-000000000003';
const customerId = 'fynn-customer-3';

describe('Revoking previously synchronized Fynn access', () => {
  let links: Map<UUID, { orgId: UUID; customerId: string }>;
  let client: FynnClient;
  let revisionStarts: number;
  let paid: boolean;
  let academy: boolean;
  let locked: boolean;
  let emitted: string[];
  let useCase: RevokeUnlinkedFynnAccessUseCase;
  let subscriptions: ApplySubscriptionSyncUseCase;
  function setup(enabled = true) {
    const emitter = new EventEmitter2();
    emitter.onAny((name) => emitted.push(String(name)));
    useCase = new RevokeUnlinkedFynnAccessUseCase(
      new ConfigService({
        app: { isCloudHosted: true },
        features: { fynnManagedSubscriptionsEnabled: enabled },
      }),
      client,
      {
        findAll: async (id?: string) =>
          [...links.values()].filter((link) => !id || link.customerId === id),
        findByOrgId: async (id: UUID) => links.get(id) ?? null,
        delete: async (id: UUID) => {
          links.delete(id);
        },
      } as unknown as FynnOrgLinkRepository,
      {
        execute: async () => {
          locked = true;
        },
      } as unknown as AcquireSeatAllocationLockUseCase,
      subscriptions,
      {
        execute: async () => {
          academy = false;
          return [{ name: 'academy.deleted', event: {} }];
        },
      } as unknown as SyncAcademyAddonUseCase,
      new FynnSyncEventsService(
        emitter,
        {
          append: async () => {},
        } as unknown as FynnOutbox,
        { execute: async () => {} } as unknown as DeliverBillingWebhookUseCase,
      ),
      {
        observe: async () => orgId,
        begin: async () => {
          revisionStarts++;
          return orgId;
        },
        isCurrent: async () => true,
      },
    );
  }
  beforeEach(() => {
    links = new Map([[orgId, { orgId, customerId }]]);
    revisionStarts = 0;
    paid = true;
    academy = true;
    locked = false;
    emitted = [];
    client = {
      getCustomer: async (id: string) => {
        const customer = (await client.listCustomerLinks()).find(
          (entry) => entry.id === id,
        );
        if (!customer) throw new FynnResourceNotFoundError();
        return customer;
      },
      listCustomerLinks: async () => [],
      listSubscriptions: async () => [],
    } as unknown as FynnClient;
    subscriptions = {
      execute: async () => {
        paid = false;
        return {
          changed: true,
          events: [{ name: 'subscription.cancelled', event: {} }],
        };
      },
    } as unknown as ApplySubscriptionSyncUseCase;
    setup();
  });
  it('preserves access when the tracked customer was relinked after sweep discovery', async () => {
    client.listCustomerLinks = async () => [
      { id: customerId, customFields: {} },
    ];
    client.getCustomer = async () => ({
      id: customerId,
      companyName: 'Town',
      defaultAddress: null,
      customFields: { 'ayunis-core-uuid': orgId },
    });
    client.listSubscriptions = async () => [{ id: 'current' }] as never;
    expect(await useCase.execute()).toMatchObject({ changed: 0, failed: 0 });
    expect(paid).toBe(true);
    expect(academy).toBe(true);
  });
  it('does not invalidate a prepared sync when cleanup finds valid subscriptions', async () => {
    client.listCustomerLinks = async () => [
      { id: customerId, customFields: { 'ayunis-core-uuid': orgId } },
    ];
    client.listSubscriptions = async () => [{ id: 'current' }] as never;
    expect(await useCase.execute()).toMatchObject({ changed: 0, failed: 0 });
    expect(revisionStarts).toBe(0);
  });

  it('revokes paid and Academy access and removes the old link when the UUID is removed', async () => {
    const result = await useCase.execute({ customerId });
    expect({
      paid,
      academy,
      tracked: links.size,
      changed: result.changed,
    }).toEqual({ paid: false, academy: false, tracked: 0, changed: 1 });
    expect(emitted).toEqual(['subscription.cancelled', 'academy.deleted']);
  });
  it('revokes the old org when the same customer moves to another org', async () => {
    client.listCustomerLinks = async () => [
      {
        id: customerId,
        customFields: {
          'ayunis-core-uuid': '00000000-0000-4000-8000-000000000004',
        },
      },
    ];
    await useCase.execute({ customerId });
    expect(paid).toBe(false);
  });
  it('preserves access if a replacement customer now links the old org and has subscriptions', async () => {
    client.listCustomerLinks = async () => [
      {
        id: 'replacement-customer',
        customFields: { 'ayunis-core-uuid': orgId },
      },
    ];
    client.listSubscriptions = async () =>
      [{ id: 'replacement-subscription' }] as never;
    await useCase.execute({ customerId });
    expect({ paid, academy, tracked: links.size }).toEqual({
      paid: true,
      academy: true,
      tracked: 1,
    });
  });
  it('revokes when a still linked customer has no subscriptions left', async () => {
    client.listCustomerLinks = async () => [
      { id: customerId, customFields: { 'ayunis-core-uuid': orgId } },
    ];
    await useCase.execute();
    expect(paid).toBe(false);
  });
  it('preserves access on a malformed nonempty source UUID until it is corrected', async () => {
    client.listCustomerLinks = async () => [
      {
        id: customerId,
        customFields: { 'ayunis-core-uuid': 'not-a-valid-uuid' },
      },
    ];
    expect(await useCase.execute()).toMatchObject({ failed: 1, changed: 0 });
    expect({ paid, academy, tracked: links.size }).toEqual({
      paid: true,
      academy: true,
      tracked: 1,
    });
  });
  it('preserves state on source failure and reports it for retry', async () => {
    client.listCustomerLinks = async () => {
      throw new Error('Fynn unavailable');
    };
    expect(await useCase.execute()).toMatchObject({ failed: 1, changed: 0 });
    expect({ paid, academy, tracked: links.size }).toEqual({
      paid: true,
      academy: true,
      tracked: 1,
    });
  });
  it('reads source before acquiring the org lock and then rechecks stored ownership', async () => {
    client.listCustomerLinks = async () => {
      expect(locked).toBe(false);
      return [];
    };
    await useCase.execute();
    expect(paid).toBe(false);
  });
  it('does not revoke an org whose stored customer changed while waiting for the lock', async () => {
    Object.assign(useCase, {
      lock: {
        execute: async () => {
          links.set(orgId, { orgId, customerId: 'replacement-customer' });
        },
      },
    });
    await useCase.execute({ customerId });
    expect(paid).toBe(true);
  });
  it('leaves untracked organizations untouched and makes replays no-ops', async () => {
    await useCase.execute();
    emitted = [];
    expect(await useCase.execute()).toEqual({
      processed: 0,
      changed: 0,
      failed: 0,
    });
    expect(emitted).toEqual([]);
  });
  it('does not publish events or discard tracking when a mutation fails', async () => {
    subscriptions.execute = async () => {
      throw new Error('storage unavailable');
    };
    expect(await useCase.execute()).toMatchObject({ failed: 1 });
    expect(links.size).toBe(1);
    expect(emitted).toEqual([]);
  });
  it('does no cleanup when the feature is disabled', async () => {
    setup(false);
    await useCase.execute();
    expect({ paid, academy, locked }).toEqual({
      paid: true,
      academy: true,
      locked: false,
    });
  });
});
