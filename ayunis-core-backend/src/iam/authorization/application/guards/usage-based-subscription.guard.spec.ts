import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { UUID } from 'crypto';
import type { IsUsageBasedSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.use-case';
import { IS_PUBLIC_KEY } from 'src/common/guards/public.guard';
import { REQUIRE_USAGE_BASED_SUBSCRIPTION_KEY } from '../decorators/usage-based-subscription.decorator';
import { UsageBasedSubscriptionGuard } from './usage-based-subscription.guard';
import { SubscriptionRequiredError } from '../authorization.errors';

describe('UsageBasedSubscriptionGuard', () => {
  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  let reflectorValues: Record<string, unknown>;
  let isUsageBased: { execute: jest.Mock };
  let guard: UsageBasedSubscriptionGuard;

  const reflector = {
    getAllAndOverride: jest.fn((key: string) => reflectorValues[key]),
  } as unknown as Reflector;

  const contextFor = (user: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflectorValues = {};
    isUsageBased = { execute: jest.fn() };
    guard = new UsageBasedSubscriptionGuard(
      reflector,
      isUsageBased as unknown as IsUsageBasedSubscriptionUseCase,
    );
  });

  it('allows routes that do not opt in, without hitting the use case', async () => {
    await expect(guard.canActivate(contextFor({ orgId }))).resolves.toBe(true);
    expect(isUsageBased.execute).not.toHaveBeenCalled();
  });

  it('allows when required and the org is usage-based', async () => {
    reflectorValues[REQUIRE_USAGE_BASED_SUBSCRIPTION_KEY] = true;
    isUsageBased.execute.mockResolvedValue(true);

    await expect(guard.canActivate(contextFor({ orgId }))).resolves.toBe(true);
  });

  it('throws a usage-based SubscriptionRequiredError when required and the org is not usage-based', async () => {
    reflectorValues[REQUIRE_USAGE_BASED_SUBSCRIPTION_KEY] = true;
    isUsageBased.execute.mockResolvedValue(false);

    const promise = guard.canActivate(contextFor({ orgId }));

    await expect(promise).rejects.toBeInstanceOf(SubscriptionRequiredError);
    await expect(promise).rejects.toMatchObject({
      code: 'SUBSCRIPTION_REQUIRED',
      statusCode: 403,
      message: expect.stringContaining('usage-based'),
    });
  });

  it('denies when required but there is no principal', async () => {
    reflectorValues[REQUIRE_USAGE_BASED_SUBSCRIPTION_KEY] = true;

    await expect(guard.canActivate(contextFor(undefined))).resolves.toBe(false);
    expect(isUsageBased.execute).not.toHaveBeenCalled();
  });

  it('defers (allows) when there is no principal on a @Public route', async () => {
    reflectorValues[REQUIRE_USAGE_BASED_SUBSCRIPTION_KEY] = true;
    reflectorValues[IS_PUBLIC_KEY] = true;

    await expect(guard.canActivate(contextFor(undefined))).resolves.toBe(true);
    expect(isUsageBased.execute).not.toHaveBeenCalled();
  });

  it('fails closed (denies) when the subscription check throws', async () => {
    reflectorValues[REQUIRE_USAGE_BASED_SUBSCRIPTION_KEY] = true;
    isUsageBased.execute.mockRejectedValue(new Error('db down'));

    await expect(guard.canActivate(contextFor({ orgId }))).resolves.toBe(false);
  });
});
