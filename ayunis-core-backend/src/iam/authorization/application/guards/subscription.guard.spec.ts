import type { ExecutionContext } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import {
  SubscriptionGuard,
  type RequestWithSubscriptionContext,
} from './subscription.guard';
import type { HasActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.use-case';
import type { GetTrialUseCase } from 'src/iam/trials/application/use-cases/get-trial/get-trial.use-case';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { REQUIRE_SUBSCRIPTION_KEY } from '../decorators/subscription.decorator';
import { IS_PUBLIC_KEY } from 'src/common/guards/public.guard';
import { TrialNotFoundError } from 'src/iam/trials/application/trial.errors';
import { Trial } from 'src/iam/trials/domain/trial.entity';
import { SubscriptionRequiredError } from '../authorization.errors';

interface ContextOverrides {
  options?: unknown;
  isPublic?: boolean;
  user?: { id?: UUID; orgId?: UUID } | { apiKeyId: UUID; orgId: UUID };
}

function createContext(overrides: ContextOverrides): {
  context: ExecutionContext;
  request: RequestWithSubscriptionContext;
  reflector: Reflector;
} {
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockImplementation((key: unknown) => {
      if (key === REQUIRE_SUBSCRIPTION_KEY) return overrides.options;
      if (key === IS_PUBLIC_KEY) return overrides.isPublic ?? false;
      return undefined;
    });

  const request = {
    user: overrides.user,
  } as unknown as RequestWithSubscriptionContext;

  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;

  return { context, request, reflector };
}

describe('SubscriptionGuard', () => {
  const orgId = randomUUID();
  const userId = randomUUID();
  const apiKeyId = randomUUID();

  let hasActiveSubscriptionUseCase: jest.Mocked<HasActiveSubscriptionUseCase>;
  let getTrialUseCase: jest.Mocked<GetTrialUseCase>;

  beforeEach(() => {
    hasActiveSubscriptionUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<HasActiveSubscriptionUseCase>;
    getTrialUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetTrialUseCase>;
  });

  const makeGuard = (reflector: Reflector): SubscriptionGuard =>
    new SubscriptionGuard(
      reflector,
      hasActiveSubscriptionUseCase,
      getTrialUseCase,
    );

  describe('metadata absent', () => {
    it('allows the request when @RequireSubscription is not set', async () => {
      const { context, reflector } = createContext({ options: undefined });

      const result = await makeGuard(reflector).canActivate(context);

      expect(result).toBe(true);
      expect(hasActiveSubscriptionUseCase.execute).not.toHaveBeenCalled();
      expect(getTrialUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('public route deferral', () => {
    it('returns true without checking when route is @Public() and no principal yet', async () => {
      const { context, reflector } = createContext({
        options: {},
        isPublic: true,
        user: undefined,
      });

      const result = await makeGuard(reflector).canActivate(context);

      expect(result).toBe(true);
      expect(hasActiveSubscriptionUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns false when route is not @Public() and no principal is present', async () => {
      const { context, reflector } = createContext({
        options: {},
        isPublic: false,
        user: undefined,
      });

      const result = await makeGuard(reflector).canActivate(context);

      expect(result).toBe(false);
      expect(hasActiveSubscriptionUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('ActiveUser principal (JWT path)', () => {
    it('grants access when an active subscription matches the type filter', async () => {
      hasActiveSubscriptionUseCase.execute.mockResolvedValue({
        hasActiveSubscription: true,
        subscriptionType: SubscriptionType.USAGE_BASED,
      });

      const { context, request, reflector } = createContext({
        options: { type: SubscriptionType.USAGE_BASED },
        user: { id: userId, orgId },
      });

      const result = await makeGuard(reflector).canActivate(context);

      expect(result).toBe(true);
      expect(hasActiveSubscriptionUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ orgId, type: SubscriptionType.USAGE_BASED }),
      );
      expect(request.subscriptionContext).toEqual({
        hasActiveSubscription: true,
        hasRemainingTrialMessages: false,
      });
    });

    it('falls through to trial when no matching subscription is found', async () => {
      hasActiveSubscriptionUseCase.execute.mockResolvedValue({
        hasActiveSubscription: false,
        subscriptionType: null,
      });
      getTrialUseCase.execute.mockResolvedValue(
        new Trial({ orgId, messagesSent: 1, maxMessages: 10 }),
      );

      const { context, request, reflector } = createContext({
        options: { type: SubscriptionType.USAGE_BASED },
        user: { id: userId, orgId },
      });

      const result = await makeGuard(reflector).canActivate(context);

      expect(result).toBe(true);
      expect(request.subscriptionContext).toEqual({
        hasActiveSubscription: false,
        hasRemainingTrialMessages: true,
      });
    });

    it('throws a usage-based SubscriptionRequiredError when the filter is unmet AND trial is exhausted', async () => {
      hasActiveSubscriptionUseCase.execute.mockResolvedValue({
        hasActiveSubscription: false,
        subscriptionType: null,
      });
      getTrialUseCase.execute.mockResolvedValue(
        new Trial({ orgId, messagesSent: 10, maxMessages: 10 }),
      );

      const { context, request, reflector } = createContext({
        options: { type: SubscriptionType.USAGE_BASED },
        user: { id: userId, orgId },
      });

      await expect(
        makeGuard(reflector).canActivate(context),
      ).rejects.toMatchObject({
        code: 'SUBSCRIPTION_REQUIRED',
        statusCode: 403,
        message: expect.stringContaining('usage-based'),
      });
      expect(request.subscriptionContext).toBeUndefined();
    });

    it('throws an active-subscription SubscriptionRequiredError for an untyped gate', async () => {
      hasActiveSubscriptionUseCase.execute.mockResolvedValue({
        hasActiveSubscription: false,
        subscriptionType: null,
      });
      getTrialUseCase.execute.mockResolvedValue(
        new Trial({ orgId, messagesSent: 10, maxMessages: 10 }),
      );

      const { context, reflector } = createContext({
        options: {},
        user: { id: userId, orgId },
      });

      await expect(
        makeGuard(reflector).canActivate(context),
      ).rejects.toMatchObject({
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'This feature requires an active subscription.',
      });
    });

    it('denies at warn (not error) with SubscriptionRequiredError when the org has no trial', async () => {
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      hasActiveSubscriptionUseCase.execute.mockResolvedValue({
        hasActiveSubscription: false,
        subscriptionType: null,
      });
      getTrialUseCase.execute.mockRejectedValue(new TrialNotFoundError(orgId));

      const { context, reflector } = createContext({
        options: {},
        user: { id: userId, orgId },
      });

      await expect(
        makeGuard(reflector).canActivate(context),
      ).rejects.toBeInstanceOf(SubscriptionRequiredError);
      // A "no trial" denial is a normal authz decision: warn, never error.
      expect(warnSpy).toHaveBeenCalledWith(
        'Access denied: no trial found',
        expect.objectContaining({ orgId }),
      );
      expect(errorSpy).not.toHaveBeenCalled();

      errorSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('logs at error and denies when the trial lookup fails unexpectedly', async () => {
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      hasActiveSubscriptionUseCase.execute.mockResolvedValue({
        hasActiveSubscription: false,
        subscriptionType: null,
      });
      getTrialUseCase.execute.mockRejectedValue(new Error('db unavailable'));

      const { context, reflector } = createContext({
        options: {},
        user: { id: userId, orgId },
      });

      const result = await makeGuard(reflector).canActivate(context);

      // Only TrialNotFoundError is graceful; a real fault still surfaces at error.
      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    it('grants access on the unfiltered form when any active subscription exists', async () => {
      hasActiveSubscriptionUseCase.execute.mockResolvedValue({
        hasActiveSubscription: true,
        subscriptionType: SubscriptionType.SEAT_BASED,
      });

      const { context, reflector } = createContext({
        options: {},
        user: { id: userId, orgId },
      });

      const result = await makeGuard(reflector).canActivate(context);

      expect(result).toBe(true);
      expect(hasActiveSubscriptionUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ orgId, type: undefined }),
      );
    });
  });

  describe('ApiKeyPrincipal (api-key path)', () => {
    it('grants access when an active usage-based subscription exists', async () => {
      hasActiveSubscriptionUseCase.execute.mockResolvedValue({
        hasActiveSubscription: true,
        subscriptionType: SubscriptionType.USAGE_BASED,
      });

      const { context, request, reflector } = createContext({
        options: { type: SubscriptionType.USAGE_BASED },
        user: { apiKeyId, orgId },
      });

      const result = await makeGuard(reflector).canActivate(context);

      expect(result).toBe(true);
      expect(request.subscriptionContext?.hasActiveSubscription).toBe(true);
    });

    it('grants access via trial when no matching subscription exists', async () => {
      hasActiveSubscriptionUseCase.execute.mockResolvedValue({
        hasActiveSubscription: false,
        subscriptionType: null,
      });
      getTrialUseCase.execute.mockResolvedValue(
        new Trial({ orgId, messagesSent: 0, maxMessages: 10 }),
      );

      const { context, request, reflector } = createContext({
        options: { type: SubscriptionType.USAGE_BASED },
        user: { apiKeyId, orgId },
      });

      const result = await makeGuard(reflector).canActivate(context);

      expect(result).toBe(true);
      expect(request.subscriptionContext?.hasRemainingTrialMessages).toBe(true);
    });

    it('denies (throws SubscriptionRequiredError) when seat-only and trial-exhausted under a usage-based filter', async () => {
      hasActiveSubscriptionUseCase.execute.mockResolvedValue({
        hasActiveSubscription: false,
        subscriptionType: null,
      });
      getTrialUseCase.execute.mockResolvedValue(
        new Trial({ orgId, messagesSent: 10, maxMessages: 10 }),
      );

      const { context, reflector } = createContext({
        options: { type: SubscriptionType.USAGE_BASED },
        user: { apiKeyId, orgId },
      });

      await expect(
        makeGuard(reflector).canActivate(context),
      ).rejects.toBeInstanceOf(SubscriptionRequiredError);
    });
  });
});
