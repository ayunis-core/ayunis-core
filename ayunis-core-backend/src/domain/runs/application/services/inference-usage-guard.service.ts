import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { CheckQuotaUseCase } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.use-case';
import { CheckQuotaQuery } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.query';
import { tierToFairUseQuotaType } from 'src/iam/quotas/domain/tier-to-quota-type';
import { ApiKeyCreditLimitGuardService } from './api-key-credit-limit-guard.service';
import { CreditBudgetGuardService } from './credit-budget-guard.service';
import { CreditLimitGuardService } from './credit-limit-guard.service';
import { CollectUsageAsyncService } from './collect-usage-async.service';
import type { RunExecutionPath } from 'src/domain/runs/application/run-execution-path';
import type { ProviderRequest } from '@ayunis/inference';
import {
  type PersonalCreditCallAuthorization,
  PersonalCreditCallBudgetService,
} from './personal-credit-call-budget.service';

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
 * Single entrypoint for pre-inference resource gating and post-inference
 * usage recording. Extracted from `ExecuteRunUseCase` so the OpenAI-compat
 * surface can reuse it without duplicating logic (the previous attempt
 * duplicated and drifted into a last-wins usage bug).
 */
@Injectable()
export class InferenceUsageGuard {
  constructor(
    private readonly checkQuotaUseCase: CheckQuotaUseCase,
    private readonly creditBudgetGuardService: CreditBudgetGuardService,
    private readonly creditLimitGuardService: CreditLimitGuardService,
    private readonly apiKeyCreditLimitGuardService: ApiKeyCreditLimitGuardService,
    private readonly collectUsageAsyncService: CollectUsageAsyncService,
    private readonly personalCreditCallBudgetService: PersonalCreditCallBudgetService,
  ) {}

  async preflight(
    principal: InferencePrincipal,
    model: LanguageModel,
  ): Promise<void> {
    if (principal.userId) {
      const fairUseQuotaType = tierToFairUseQuotaType(model.tier);
      if (fairUseQuotaType !== null) {
        await this.checkQuotaUseCase.execute(
          new CheckQuotaQuery(
            principal.userId,
            principal.orgId,
            fairUseQuotaType,
          ),
        );
      }
    }

    await this.ensureCreditsAvailable(principal, model);
  }

  async authorizeModelCall(
    principal: InferencePrincipal,
    model: LanguageModel,
    request: ProviderRequest,
  ): Promise<PersonalCreditCallAuthorization | null> {
    if (!model.consumesCredits) return null;
    await this.creditBudgetGuardService.ensureBudgetAvailable(principal.orgId);
    if (principal.userId) {
      const { reservePersonalCredits } =
        await this.creditLimitGuardService.prepareUserModelCall(
          principal.orgId,
          principal.userId,
        );
      if (!reservePersonalCredits) return null;
      return this.personalCreditCallBudgetService.reserve(model, request);
    }
    if (principal.apiKeyId) {
      await this.apiKeyCreditLimitGuardService.ensureWithinLimit(
        principal.orgId,
        principal.apiKeyId,
      );
    }
    return null;
  }

  async releaseCreditReservation(reservationId: UUID): Promise<void> {
    await this.personalCreditCallBudgetService.release(reservationId);
  }

  async ensureCreditsAvailable(
    principal: InferencePrincipal,
    model: LanguageModel,
  ): Promise<void> {
    // Credit budget/limit gating only applies to models that actually consume
    // credits. Free open-source models must stay usable after the org's monthly
    // credit budget is exhausted; fair-use is checked separately by preflight().
    if (!model.consumesCredits) {
      return;
    }

    await this.creditBudgetGuardService.ensureBudgetAvailable(principal.orgId);
    if (principal.userId) {
      await this.creditLimitGuardService.ensureWithinLimits(
        principal.orgId,
        principal.userId,
      );
    } else if (principal.apiKeyId) {
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

  async collectUsageAndWait(
    model: LanguageModel,
    usage: { inputTokens: number; outputTokens: number },
    requestId?: UUID,
    executionPath?: RunExecutionPath,
  ): Promise<void> {
    await this.collectUsageAsyncService.collectAndWait(
      model,
      usage.inputTokens,
      usage.outputTokens,
      requestId,
      executionPath,
    );
  }
}
