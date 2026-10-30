jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));
import { ApplyExternalSubscriptionUseCase } from './apply-external-subscription.use-case';

it('rejects stale prepared state before changing access or ownership', async () => {
  const subscriptions = { execute: jest.fn() };
  const useCase = new ApplyExternalSubscriptionUseCase(
    { get: () => true } as never,
    { execute: jest.fn() } as never,
    { execute: jest.fn() } as never,
    subscriptions as never,
    { execute: jest.fn() } as never,
    { execute: jest.fn() } as never,
    { publish: jest.fn() } as never,
    { findByOrgId: jest.fn() } as never,
    { isCurrent: async () => false } as never,
  );
  await expect(
    useCase.execute({
      orgId: '00000000-0000-4000-8000-000000000004',
      revision: '00000000-0000-4000-8000-000000000005',
      ownerId: 'billing/customer-42',
      subscription: null,
      academyActive: false,
      revoke: false,
    }),
  ).rejects.toMatchObject({ code: 'EXTERNAL_SUBSCRIPTION_STALE' });
  expect(subscriptions.execute).not.toHaveBeenCalled();
});
