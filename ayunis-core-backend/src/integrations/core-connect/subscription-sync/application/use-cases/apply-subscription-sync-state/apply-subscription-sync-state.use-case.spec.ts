jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));
import { Logger } from '@nestjs/common';
import { ApplySubscriptionSyncUseCase } from 'src/iam/subscriptions/application/use-cases/apply-subscription-sync/apply-subscription-sync.use-case';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import type { SubscriptionSyncCommand } from 'src/integrations/core-connect/subscription-sync/application/models/subscription-sync-command';
import { ApplySubscriptionSyncStateUseCase } from './apply-subscription-sync-state.use-case';

const orgId = '00000000-0000-4000-8000-000000000004';
const revision = '00000000-0000-4000-8000-000000000005';
const command = (): SubscriptionSyncCommand => ({
  orgId,
  revision,
  deliveryId: 'delivery-42',
  ownerId: 'billing/customer-42',
  subscription: null,
  academyActive: false,
  revoke: false,
});
function harness() {
  const subscriptions = {
    execute: jest
      .fn()
      .mockResolvedValue({ changed: true, subscription: null, events: [] }),
  };
  const links = {
    findByOrgId: jest
      .fn()
      .mockResolvedValue({ orgId, ownerId: 'billing/previous' }),
    save: jest.fn(),
    delete: jest.fn(),
  };
  const revisions = {
    isCurrent: jest.fn().mockResolvedValue(true),
    begin: jest.fn(),
  };
  const events = { publish: jest.fn().mockResolvedValue(undefined) };
  const useCase = new ApplySubscriptionSyncStateUseCase(
    { get: () => true } as never,
    { execute: jest.fn() } as never,
    subscriptions as never,
    { execute: jest.fn() } as never,
    { execute: jest.fn().mockResolvedValue([]) } as never,
    events as never,
    links as never,
    revisions as never,
  );
  return { useCase, subscriptions, links, revisions, events };
}
afterEach(() => jest.restoreAllMocks());
it('rejects stale prepared state before changing access or ownership', async () => {
  const { useCase, subscriptions, revisions } = harness();
  revisions.isCurrent.mockResolvedValue(false);
  await expect(useCase.execute(command())).rejects.toMatchObject({
    code: 'EXTERNAL_SUBSCRIPTION_STALE',
  });
  expect(subscriptions.execute).not.toHaveBeenCalled();
});
it.each([SubscriptionType.USAGE_BASED, SubscriptionType.SEAT_BASED])(
  'audits committed %s access without billing details',
  async (type) => {
    const { useCase } = harness();
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const base = {
      startsAt: new Date('2026-01-01'),
      cancelledAt: null,
      endsAt: null,
      billingInfo: {
        companyName: 'PRIVATE COMPANY',
        street: 'PRIVATE STREET',
        houseNumber: '1',
        postalCode: '12345',
        city: 'City',
        country: 'DE',
        vatNumber: 'PRIVATE VAT',
      },
    };
    const subscription =
      type === SubscriptionType.USAGE_BASED
        ? { ...base, type, monthlyCredits: 1000000 }
        : { ...base, type, noOfSeats: 25 };
    expect(await useCase.execute({ ...command(), subscription })).toEqual({
      changed: true,
    });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId,
        revision,
        deliveryId: 'delivery-42',
        ownerId: 'billing/customer-42',
        previousOwnerId: 'billing/previous',
        subscriptionType: type,
        monthlyCredits: type === SubscriptionType.USAGE_BASED ? 1000000 : null,
        noOfSeats: type === SubscriptionType.SEAT_BASED ? 25 : null,
        academyActive: false,
        revoke: false,
        changed: true,
        outcome: 'applied',
      }),
      'External subscription state committed',
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('PRIVATE');
  },
);
it('logs the committed state only after all transactional work finishes', async () => {
  const { useCase, events } = harness();
  const log = jest
    .spyOn(Logger.prototype, 'log')
    .mockImplementation(() => undefined);
  let release!: () => void;
  let entered!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  events.publish.mockImplementationOnce(() => {
    entered();
    return gate;
  });
  const pending = useCase.execute(command());
  await started;
  expect(log).not.toHaveBeenCalledWith(
    expect.anything(),
    'External subscription state committed',
  );
  release();
  await pending;
  expect(log).toHaveBeenCalledWith(
    expect.anything(),
    'External subscription state committed',
  );
});
it('does not claim a committed state when a later transactional effect fails', async () => {
  const { useCase, events } = harness();
  const log = jest
    .spyOn(Logger.prototype, 'log')
    .mockImplementation(() => undefined);
  events.publish.mockRejectedValueOnce(new Error('outbox failed'));
  await expect(useCase.execute(command())).rejects.toThrow();
  expect(log).not.toHaveBeenCalledWith(
    expect.anything(),
    'External subscription state committed',
  );
});
it('distinguishes an ownership mismatch from an applied revocation', async () => {
  const { useCase, subscriptions, links } = harness();
  const log = jest
    .spyOn(Logger.prototype, 'log')
    .mockImplementation(() => undefined);
  expect(await useCase.execute({ ...command(), revoke: true })).toEqual({
    changed: false,
  });
  expect(subscriptions.execute).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith(
    expect.objectContaining({
      ownerId: 'billing/customer-42',
      previousOwnerId: 'billing/previous',
      outcome: 'ownership_mismatch',
      changed: false,
    }),
    'External subscription revocation skipped',
  );
  links.findByOrgId.mockResolvedValue({
    orgId,
    ownerId: 'billing/customer-42',
  });
  expect(await useCase.execute({ ...command(), revoke: true })).toEqual({
    changed: true,
  });
  expect(log).toHaveBeenCalledWith(
    expect.objectContaining({
      revoke: true,
      subscriptionType: null,
      noOfSeats: null,
      monthlyCredits: null,
      outcome: 'applied',
    }),
    'External subscription state committed',
  );
});

it('audits a no-op replay as accepted without claiming a state change', async () => {
  const { useCase, subscriptions, links } = harness();
  const log = jest
    .spyOn(Logger.prototype, 'log')
    .mockImplementation(() => undefined);
  subscriptions.execute.mockResolvedValue({
    changed: false,
    subscription: null,
    events: [],
  });
  links.findByOrgId.mockResolvedValue({
    orgId,
    ownerId: 'billing/customer-42',
  });
  expect(await useCase.execute(command())).toEqual({ changed: false });
  expect(log).toHaveBeenCalledWith(
    expect.objectContaining({
      previousOwnerId: 'billing/customer-42',
      nextOwnerId: 'billing/customer-42',
      changed: false,
      outcome: 'applied',
    }),
    'External subscription state committed',
  );
});

it('acquires the organization allocation lock only once through the subscription application', async () => {
  const allocation = { execute: jest.fn().mockResolvedValue(undefined) };
  const subscriptions = new ApplySubscriptionSyncUseCase(
    { findByOrgId: async () => [] } as never,
    {} as never,
    allocation as never,
  );
  const useCase = new ApplySubscriptionSyncStateUseCase(
    { get: () => true } as never,
    { execute: async () => undefined } as never,
    subscriptions,
    { execute: async () => false } as never,
    { execute: async () => [] } as never,
    { publish: async () => undefined } as never,
    { findByOrgId: async () => null, save: async () => undefined } as never,
    { isCurrent: async () => true, begin: async () => revision } as never,
  );
  await expect(useCase.execute(command())).resolves.toEqual({ changed: false });
  expect(allocation.execute).toHaveBeenCalledTimes(1);
  expect(allocation.execute).toHaveBeenCalledWith(orgId);
});
