import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { RunExecutionPath } from 'src/domain/runs/application/run-execution-path';
import { CheckQuotaUseCase } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.use-case';
import { CheckQuotaQuery } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.query';
import { tierToFairUseQuotaType } from 'src/iam/quotas/domain/tier-to-quota-type';
import { ApiKeyCreditLimitGuardService } from './api-key-credit-limit-guard.service';
import { CreditBudgetGuardService } from './credit-budget-guard.service';
import { CreditLimitGuardService } from './credit-limit-guard.service';
import { CollectUsageAsyncService } from './collect-usage-async.service';

/**
 * Flat principal shape passed to the guard. Either `userId` or `apiKeyId`
 * must be set (DB-enforced by the XOR `@Check` on `usage`). Fair-use is
 * user-scoped today, so api-key principals skip that bucket but still pay
 * the org-scoped credit budget — the binding limit in either case.
 */
export interface InferencePrincipal {
  userId?: UUID;
  apiKeyId?: UUID;
  orgId: UUID;
}

/**
 * Shared inference resource policy. Run admission checks fair-use once;
 * every paid model-call boundary checks persisted monetary usage; terminal
 * call hooks choose awaited or fire-and-forget usage collection explicitly.
 */
@Injectable()
export class InferenceUsageGuard {
  constructor(
    private readonly checkQuotaUseCase: CheckQuotaUseCase,
    private readonly creditBudgetGuardService: CreditBudgetGuardService,
    private readonly creditLimitGuardService: CreditLimitGuardService,
    private readonly apiKeyCreditLimitGuardService: ApiKeyCreditLimitGuardService,
    private readonly collectUsageAsyncService: CollectUsageAsyncService,
  ) {}

  async preflight(
    principal: InferencePrincipal,
    model: LanguageModel,
  ): Promise<void> {
    if (!principal.userId) return;
    const fairUseQuotaType = tierToFairUseQuotaType(model.tier);
    if (fairUseQuotaType === null) return;
    await this.checkQuotaUseCase.execute(
      new CheckQuotaQuery(principal.userId, principal.orgId, fairUseQuotaType),
    );
  }

  async ensureModelCallAllowed(
    principal: InferencePrincipal,
    model: LanguageModel,
  ): Promise<void> {
    if (!model.consumesCredits) return;

    const { monetaryLimitsApply } =
      await this.creditBudgetGuardService.ensureBudgetAvailable(
        principal.orgId,
      );
    if (!monetaryLimitsApply) return;
    if (principal.userId) {
      await this.creditLimitGuardService.ensureWithinLimits(
        principal.orgId,
        principal.userId,
      );
      return;
    }
    if (principal.apiKeyId) {
      await this.apiKeyCreditLimitGuardService.ensureWithinLimit(
        principal.orgId,
        principal.apiKeyId,
      );
    }
  }

  collectUsage(
    model: LanguageModel,
    usage: { inputTokens: number; outputTokens: number },
    requestId?: UUID,
    executionPath?: RunExecutionPath,
  ): void {
    this.collectUsageAsyncService.collect(
      model,
      usage.inputTokens,
      usage.outputTokens,
      requestId,
      executionPath,
    );
  }

  collectUsageCritical(
    model: LanguageModel,
    usage: { inputTokens: number; outputTokens: number },
    requestId?: UUID,
    executionPath?: RunExecutionPath,
  ): Promise<void> {
    return this.collectUsageAsyncService.collectCritical(
      model,
      usage.inputTokens,
      usage.outputTokens,
      requestId,
      executionPath,
    );
  }
}
