import { Logger } from '@nestjs/common';
import { FynnResourceNotFoundError } from 'src/integrations/fynn/application/fynn.errors';
import type { RevokeUnlinkedFynnAccessUseCase } from 'src/integrations/fynn/application/use-cases/revoke-unlinked-fynn-access/revoke-unlinked-fynn-access.use-case';
import { ConfigService } from '@nestjs/config';
import type { FynnClient } from 'src/integrations/fynn/application/ports/fynn-client';
import type { SyncFynnSubscriptionUseCase } from 'src/integrations/fynn/application/use-cases/sync-fynn-subscription/sync-fynn-subscription.use-case';
import { ReconcileFynnSubscriptionsUseCase } from './reconcile-fynn-subscriptions.use-case';

const org = '00000000-0000-4000-8000-000000000003';
const customer = {
  id: 'customer-3',
  customFields: { 'ayunis-core-uuid': org },
};

describe('Fynn reconciliation', () => {
  let client: FynnClient;
  let sync: SyncFynnSubscriptionUseCase;
  let synced: string[];
  function useCase(enabled = true, cloud = true) {
    return new ReconcileFynnSubscriptionsUseCase(
      new ConfigService({
        app: { isCloudHosted: cloud },
        features: { fynnManagedSubscriptionsEnabled: enabled },
      }),
      client,
      sync,
      {
        execute: async () => ({ changed: 0, failed: 0, processed: 0 }),
      } as unknown as RevokeUnlinkedFynnAccessUseCase,
    );
  }
  beforeEach(() => {
    synced = [];
    client = {
      listCustomerLinks: async () => [customer],
      getCustomer: async () => customer,
      listSubscriptions: async () => [
        { id: 'subscription-3', customer: { id: customer.id } },
      ],
    } as unknown as FynnClient;
    sync = {
      execute: async ({ subscriptionId }: { subscriptionId: string }) => {
        synced.push(subscriptionId);
        return { orgId: org, changed: true };
      },
    } as unknown as SyncFynnSubscriptionUseCase;
  });
  it('cleans up the known customer when it has been deleted in Fynn', async () => {
    client.getCustomer = async () => {
      throw new FynnResourceNotFoundError();
    };
    const instance = useCase();
    Object.assign(instance, {
      cleanup: {
        execute: async () => ({ processed: 1, changed: 1, failed: 0 }),
      },
    });
    await expect(
      instance.execute({ customerId: customer.id }),
    ).resolves.toMatchObject({ changed: 1, failed: 0 });
    expect(synced).toEqual([]);
  });
  it('reports an unlinked customer with subscriptions during reconciliation', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    client.listCustomerLinks = async () => [{ ...customer, customFields: {} }];
    try {
      await expect(
        useCase().execute({ deliveryId: 'sweep-missing-link' }),
      ).resolves.toMatchObject({ skipped: 1, failed: 0 });
      expect(warn).toHaveBeenCalledWith(
        {
          code: 'FYNN_ORG_LINK_MISSING',
          customerId: customer.id,
          deliveryId: 'sweep-missing-link',
        },
        expect.stringContaining('ayunis-core-uuid'),
      );
      expect(synced).toEqual([]);
    } finally {
      warn.mockRestore();
    }
  });

  it('does not report offers without subscriptions as missing subscription links', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    client.listCustomerLinks = async () => [{ ...customer, customFields: {} }];
    client.listSubscriptions = async () => [];
    try {
      await useCase().execute();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('runs cleanup even when the customer has removed its Core link', async () => {
    client.listCustomerLinks = async () => [
      { id: customer.id, customFields: [] },
    ];
    const instance = useCase();
    Object.assign(instance, {
      cleanup: {
        execute: async () => ({ changed: 1, failed: 0, processed: 1 }),
      },
    });
    expect(await instance.execute()).toMatchObject({ changed: 1 });
  });
  it('runs the same current-state sync for linked subscriptions and reports changes', async () => {
    expect(await useCase().execute()).toMatchObject({
      processed: 1,
      changed: 1,
      failed: 0,
    });
    expect(synced).toEqual(['subscription-3']);
  });
  it.each([
    [false, true],
    [true, false],
  ])(
    'does no provider work when disabled or self-hosted',
    async (enabled, cloud) => {
      client.listCustomerLinks = async () => {
        throw new Error('unexpected provider access');
      };
      expect(await useCase(enabled, cloud).execute()).toMatchObject({
        processed: 0,
        failed: 0,
      });
      expect(synced).toEqual([]);
    },
  );
  it('skips unlinked customers and accepted offers without subscriptions', async () => {
    client.listCustomerLinks = async () => [
      customer,
      { id: 'unlinked', customFields: [] },
    ];
    client.listSubscriptions = async () => [];
    expect(await useCase().execute()).toMatchObject({
      processed: 0,
      skipped: 2,
      failed: 0,
    });
    expect(synced).toEqual([]);
  });
  it('isolates per-customer failures and continues with the remaining organizations', async () => {
    client.listCustomerLinks = async () => [
      { id: 'broken', customFields: { 'ayunis-core-uuid': 'invalid' } },
      customer,
    ];
    expect(await useCase().execute()).toMatchObject({
      processed: 1,
      changed: 1,
      failed: 1,
    });
    expect(synced).toEqual(['subscription-3']);
  });
  it('does not acknowledge a failed synchronization as a corrected difference', async () => {
    sync.execute = async () => {
      throw new Error('Fynn unavailable');
    };
    expect(await useCase().execute()).toMatchObject({
      processed: 0,
      changed: 0,
      failed: 1,
    });
  });
  it('reloads only the affected customer for customer.updated', async () => {
    client.listCustomerLinks = async () => {
      throw new Error('account listing not needed');
    };
    expect(await useCase().execute({ customerId: customer.id })).toMatchObject({
      processed: 1,
      failed: 0,
    });
    expect(synced).toEqual(['subscription-3']);
  });
  it('processes duplicate customer links once while the sync checks org-wide ambiguity', async () => {
    client.listCustomerLinks = async () => [
      customer,
      { ...customer, id: 'customer-duplicate' },
    ];
    expect(await useCase().execute()).toMatchObject({
      processed: 1,
      skipped: 1,
    });
    expect(synced).toEqual(['subscription-3']);
  });
});
