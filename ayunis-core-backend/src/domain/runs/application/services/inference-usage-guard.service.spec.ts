import { randomUUID } from 'crypto';
import type { CheckQuotaUseCase } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.use-case';
import type { ApiKeyCreditLimitGuardService } from './api-key-credit-limit-guard.service';
import type { CreditBudgetGuardService } from './credit-budget-guard.service';
import type { CreditLimitGuardService } from './credit-limit-guard.service';
import type { CollectUsageAsyncService } from './collect-usage-async.service';
import { InferenceUsageGuard } from './inference-usage-guard.service';
import {
  ApiKeyCreditLimitExceededError,
  UserCreditLimitExceededError,
} from 'src/iam/credit-limits/application/credit-limits.errors';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';
import { QuotaType } from 'src/iam/quotas/domain/quota-type.enum';
import { QuotaExceededError } from 'src/iam/quotas/application/quotas.errors';
import { CreditBudgetExceededError } from 'src/iam/subscriptions/application/subscription.errors';

describe('InferenceUsageGuard', () => {
  let guard: InferenceUsageGuard;
  let checkQuotaUseCase: jest.Mocked<CheckQuotaUseCase>;
  let creditBudgetGuardService: jest.Mocked<CreditBudgetGuardService>;
  let creditLimitGuardService: jest.Mocked<CreditLimitGuardService>;
  let apiKeyCreditLimitGuardService: jest.Mocked<ApiKeyCreditLimitGuardService>;
  let collectUsageAsyncService: jest.Mocked<CollectUsageAsyncService>;

  const userId = randomUUID();
  const apiKeyId = randomUUID();
  const orgId = randomUUID();

  const makeModel = (
    tier?: ModelTier,
    costs: { inputTokenCost?: number; outputTokenCost?: number } = {
      inputTokenCost: 5,
      outputTokenCost: 15,
    },
  ): LanguageModel =>
    new LanguageModel({
      name: 'gpt-4o',
      provider: ModelProvider.OPENAI,
      displayName: 'GPT-4o',
      canStream: true,
      canUseTools: true,
      isReasoning: false,
      canVision: false,
      isArchived: false,
      tier,
      inputTokenCost: costs.inputTokenCost,
      outputTokenCost: costs.outputTokenCost,
    });

  // Free open-source model (e.g. a German-hosted "DE" model): no token costs.
  const makeFreeModel = (tier?: ModelTier): LanguageModel =>
    makeModel(tier, {});

  beforeEach(() => {
    checkQuotaUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CheckQuotaUseCase>;
    creditBudgetGuardService = {
      ensureBudgetAvailable: jest
        .fn()
        .mockResolvedValue({ monetaryLimitsApply: true }),
    } as unknown as jest.Mocked<CreditBudgetGuardService>;
    creditLimitGuardService = {
      ensureWithinLimits: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CreditLimitGuardService>;
    apiKeyCreditLimitGuardService = {
      ensureWithinLimit: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ApiKeyCreditLimitGuardService>;
    collectUsageAsyncService = {
      collect: jest.fn(),
      collectCritical: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CollectUsageAsyncService>;

    guard = new InferenceUsageGuard(
      checkQuotaUseCase,
      creditBudgetGuardService,
      creditLimitGuardService,
      apiKeyCreditLimitGuardService,
      collectUsageAsyncService,
    );
  });

  describe('preflight', () => {
    it('checks only the user fair-use quota during run admission', async () => {
      await guard.preflight({ userId, orgId }, makeModel(ModelTier.MEDIUM));

      expect(checkQuotaUseCase.execute.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          userId,
          orgId,
          quotaType: QuotaType.FAIR_USE_MESSAGES_MEDIUM,
        }),
      );
      expect(
        creditBudgetGuardService.ensureBudgetAvailable,
      ).not.toHaveBeenCalled();
      expect(creditLimitGuardService.ensureWithinLimits).not.toHaveBeenCalled();
    });

    it('propagates fair-use rejection without running monetary policy', async () => {
      checkQuotaUseCase.execute.mockRejectedValue(
        new QuotaExceededError(
          QuotaType.FAIR_USE_MESSAGES_MEDIUM,
          100,
          3600_000,
          60,
        ),
      );

      await expect(
        guard.preflight({ userId, orgId }, makeModel(ModelTier.MEDIUM)),
      ).rejects.toBeInstanceOf(QuotaExceededError);
      expect(
        creditBudgetGuardService.ensureBudgetAvailable,
      ).not.toHaveBeenCalled();
    });

    it('skips fair-use for API-key principals', async () => {
      await guard.preflight({ apiKeyId, orgId }, makeModel(ModelTier.MEDIUM));

      expect(checkQuotaUseCase.execute).not.toHaveBeenCalled();
      expect(
        creditBudgetGuardService.ensureBudgetAvailable,
      ).not.toHaveBeenCalled();
    });
  });

  describe('ensureModelCallAllowed', () => {
    it('checks the organization and all user limits at the paid-call boundary', async () => {
      await guard.ensureModelCallAllowed(
        { userId, orgId },
        makeModel(ModelTier.MEDIUM),
      );

      expect(
        creditBudgetGuardService.ensureBudgetAvailable,
      ).toHaveBeenCalledWith(orgId);
      expect(creditLimitGuardService.ensureWithinLimits).toHaveBeenCalledWith(
        orgId,
        userId,
      );
    });

    it('propagates organization budget rejection', async () => {
      creditBudgetGuardService.ensureBudgetAvailable.mockRejectedValue(
        new CreditBudgetExceededError({
          orgId,
          creditsUsed: 1000,
          monthlyCredits: 500,
        }),
      );

      await expect(
        guard.ensureModelCallAllowed(
          { userId, orgId },
          makeModel(ModelTier.MEDIUM),
        ),
      ).rejects.toBeInstanceOf(CreditBudgetExceededError);
      expect(creditLimitGuardService.ensureWithinLimits).not.toHaveBeenCalled();
    });

    it('propagates personal limit rejection', async () => {
      creditLimitGuardService.ensureWithinLimits.mockRejectedValue(
        new UserCreditLimitExceededError({
          userId,
          creditsUsed: 100,
          limit: 50,
        }),
      );

      await expect(
        guard.ensureModelCallAllowed(
          { userId, orgId },
          makeModel(ModelTier.MEDIUM),
        ),
      ).rejects.toBeInstanceOf(UserCreditLimitExceededError);
    });

    it('checks the organization and acting API-key limit', async () => {
      await guard.ensureModelCallAllowed(
        { apiKeyId, orgId },
        makeModel(ModelTier.MEDIUM),
      );

      expect(
        creditBudgetGuardService.ensureBudgetAvailable,
      ).toHaveBeenCalledWith(orgId);
      expect(
        apiKeyCreditLimitGuardService.ensureWithinLimit,
      ).toHaveBeenCalledWith(orgId, apiKeyId);
    });

    it('propagates API-key limit rejection', async () => {
      apiKeyCreditLimitGuardService.ensureWithinLimit.mockRejectedValue(
        new ApiKeyCreditLimitExceededError({
          apiKeyId,
          creditsUsed: 100,
          limit: 100,
        }),
      );

      await expect(
        guard.ensureModelCallAllowed(
          { apiKeyId, orgId },
          makeModel(ModelTier.MEDIUM),
        ),
      ).rejects.toBeInstanceOf(ApiKeyCreditLimitExceededError);
    });

    it('skips principal limits when the organization is not usage-based', async () => {
      creditBudgetGuardService.ensureBudgetAvailable.mockResolvedValue({
        monetaryLimitsApply: false,
      });

      await guard.ensureModelCallAllowed(
        { userId, orgId },
        makeModel(ModelTier.MEDIUM),
      );

      expect(creditLimitGuardService.ensureWithinLimits).not.toHaveBeenCalled();
      expect(
        apiKeyCreditLimitGuardService.ensureWithinLimit,
      ).not.toHaveBeenCalled();
    });

    it('bypasses every monetary limit for free models', async () => {
      await guard.ensureModelCallAllowed(
        { userId, orgId },
        makeFreeModel(ModelTier.MEDIUM),
      );

      expect(
        creditBudgetGuardService.ensureBudgetAvailable,
      ).not.toHaveBeenCalled();
      expect(creditLimitGuardService.ensureWithinLimits).not.toHaveBeenCalled();
      expect(
        apiKeyCreditLimitGuardService.ensureWithinLimit,
      ).not.toHaveBeenCalled();
    });
  });

  describe('collectUsage', () => {
    it('keeps non-critical callers fire-and-forget', () => {
      const model = makeModel(ModelTier.LOW);
      const requestId = randomUUID();

      const result = guard.collectUsage(
        model,
        { inputTokens: 42, outputTokens: 8 },
        requestId,
        'legacy',
      );

      expect(result).toBeUndefined();
      expect(collectUsageAsyncService.collect).toHaveBeenCalledWith(
        model,
        42,
        8,
        requestId,
        'legacy',
      );
    });

    it('awaits critical agent-runtime usage collection', async () => {
      const model = makeModel(ModelTier.LOW);
      const requestId = randomUUID();
      const persistenceError = new Error('Usage database unavailable');
      collectUsageAsyncService.collectCritical.mockRejectedValue(
        persistenceError,
      );

      await expect(
        guard.collectUsageCritical(
          model,
          { inputTokens: 42, outputTokens: 8 },
          requestId,
          'agent_runtime',
        ),
      ).rejects.toBe(persistenceError);
      expect(collectUsageAsyncService.collectCritical).toHaveBeenCalledWith(
        model,
        42,
        8,
        requestId,
        'agent_runtime',
      );
      expect(collectUsageAsyncService.collect).not.toHaveBeenCalled();
    });
  });
});
