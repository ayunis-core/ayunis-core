import { randomUUID } from 'crypto';
import type { CheckQuotaUseCase } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.use-case';
import type { CreditBudgetGuardService } from './credit-budget-guard.service';
import type { CreditLimitGuardService } from './credit-limit-guard.service';
import type { CollectUsageAsyncService } from './collect-usage-async.service';
import { InferenceUsageGuard } from './inference-usage-guard.service';
import { UserCreditLimitExceededError } from 'src/iam/credit-limits/application/credit-limits.errors';
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
      ensureBudgetAvailable: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CreditBudgetGuardService>;
    creditLimitGuardService = {
      ensureWithinLimits: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CreditLimitGuardService>;
    collectUsageAsyncService = {
      collect: jest.fn(),
    } as unknown as jest.Mocked<CollectUsageAsyncService>;

    guard = new InferenceUsageGuard(
      checkQuotaUseCase,
      creditBudgetGuardService,
      creditLimitGuardService,
      collectUsageAsyncService,
    );
  });

  describe('preflight with userId principal', () => {
    it('runs fair-use + credit-budget when the model has a tier bucket', async () => {
      await guard.preflight({ userId, orgId }, makeModel(ModelTier.MEDIUM));

      expect(checkQuotaUseCase.execute).toHaveBeenCalledTimes(1);
      expect(checkQuotaUseCase.execute.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          userId,
          orgId,
          quotaType: QuotaType.FAIR_USE_MESSAGES_MEDIUM,
        }),
      );
      expect(
        creditBudgetGuardService.ensureBudgetAvailable,
      ).toHaveBeenCalledWith(orgId);
      expect(creditLimitGuardService.ensureWithinLimits).toHaveBeenCalledWith(
        orgId,
        userId,
      );
    });

    it('propagates UserCreditLimitExceededError from the credit-limit guard', async () => {
      creditLimitGuardService.ensureWithinLimits.mockRejectedValue(
        new UserCreditLimitExceededError({
          userId,
          creditsUsed: 100,
          limit: 50,
        }),
      );

      await expect(
        guard.preflight({ userId, orgId }, makeModel(ModelTier.MEDIUM)),
      ).rejects.toBeInstanceOf(UserCreditLimitExceededError);
    });

    it('skips fair-use for a ZERO-tier model but still runs credit-budget', async () => {
      await guard.preflight({ userId, orgId }, makeModel(ModelTier.ZERO));

      expect(checkQuotaUseCase.execute).not.toHaveBeenCalled();
      expect(
        creditBudgetGuardService.ensureBudgetAvailable,
      ).toHaveBeenCalledWith(orgId);
    });

    it('propagates QuotaExceededError from fair-use check', async () => {
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

    it('propagates CreditBudgetExceededError', async () => {
      creditBudgetGuardService.ensureBudgetAvailable.mockRejectedValue(
        new CreditBudgetExceededError({
          orgId,
          creditsUsed: 1000,
          monthlyCredits: 500,
        }),
      );

      await expect(
        guard.preflight({ userId, orgId }, makeModel(ModelTier.MEDIUM)),
      ).rejects.toBeInstanceOf(CreditBudgetExceededError);
    });

    it('skips credit-budget and credit-limit for a free model with no token costs', async () => {
      await guard.preflight({ userId, orgId }, makeFreeModel(ModelTier.MEDIUM));

      expect(
        creditBudgetGuardService.ensureBudgetAvailable,
      ).not.toHaveBeenCalled();
      expect(creditLimitGuardService.ensureWithinLimits).not.toHaveBeenCalled();
    });

    it('still runs fair-use for a free model with a tier bucket', async () => {
      await guard.preflight({ userId, orgId }, makeFreeModel(ModelTier.MEDIUM));

      expect(checkQuotaUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('does not throw for a free model even when the credit budget is exhausted', async () => {
      creditBudgetGuardService.ensureBudgetAvailable.mockRejectedValue(
        new CreditBudgetExceededError({
          orgId,
          creditsUsed: 1000,
          monthlyCredits: 500,
        }),
      );

      await expect(
        guard.preflight({ userId, orgId }, makeFreeModel(ModelTier.ZERO)),
      ).resolves.toBeUndefined();
    });
  });

  describe('preflight with apiKey principal', () => {
    it('skips fair-use entirely for api-key requests and still runs credit-budget', async () => {
      await guard.preflight({ apiKeyId, orgId }, makeModel(ModelTier.MEDIUM));

      expect(checkQuotaUseCase.execute).not.toHaveBeenCalled();
      expect(
        creditBudgetGuardService.ensureBudgetAvailable,
      ).toHaveBeenCalledWith(orgId);
      expect(creditLimitGuardService.ensureWithinLimits).not.toHaveBeenCalled();
    });

    it('skips credit-budget for a free model on an api-key request', async () => {
      await guard.preflight(
        { apiKeyId, orgId },
        makeFreeModel(ModelTier.MEDIUM),
      );

      expect(checkQuotaUseCase.execute).not.toHaveBeenCalled();
      expect(
        creditBudgetGuardService.ensureBudgetAvailable,
      ).not.toHaveBeenCalled();
    });
  });

  describe('collectUsage', () => {
    it('forwards (model, inputTokens, outputTokens, requestId) to CollectUsageAsyncService', () => {
      const model = makeModel(ModelTier.LOW);
      const requestId = randomUUID();

      guard.collectUsage(
        model,
        { inputTokens: 42, outputTokens: 8 },
        requestId,
      );

      expect(collectUsageAsyncService.collect).toHaveBeenCalledTimes(1);
      expect(collectUsageAsyncService.collect).toHaveBeenCalledWith(
        model,
        42,
        8,
        requestId,
      );
    });
  });
});
