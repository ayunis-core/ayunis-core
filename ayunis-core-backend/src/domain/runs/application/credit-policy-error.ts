import type { RunEvent } from '@ayunis/agent-runtime';
import type { ApplicationError } from 'src/common/errors/base.error';
import {
  ApiKeyCreditLimitExceededError,
  TeamCreditLimitExceededError,
  UserCreditLimitExceededError,
} from 'src/iam/credit-limits/application/credit-limits.errors';
import { CreditBudgetExceededError } from 'src/iam/subscriptions/application/subscription.errors';

type RunErrorEvent = Extract<RunEvent, { type: 'error' }>;

const CREDIT_POLICY_ERROR_FACTORIES = new Map<
  string,
  (event: RunErrorEvent) => ApplicationError
>([
  [
    'CREDIT_BUDGET_EXCEEDED',
    (event) => new CreditBudgetExceededError(event.details),
  ],
  [
    'USER_CREDIT_LIMIT_EXCEEDED',
    (event) => new UserCreditLimitExceededError(event.details),
  ],
  [
    'TEAM_CREDIT_LIMIT_EXCEEDED',
    (event) => new TeamCreditLimitExceededError(event.details),
  ],
  [
    'API_KEY_CREDIT_LIMIT_EXCEEDED',
    (event) => new ApiKeyCreditLimitExceededError(event.details),
  ],
]);

export function isCreditPolicyErrorCode(code: string): boolean {
  return CREDIT_POLICY_ERROR_FACTORIES.has(code);
}

export function mapCreditPolicyError(
  event: RunErrorEvent,
): ApplicationError | undefined {
  return CREDIT_POLICY_ERROR_FACTORIES.get(event.code)?.(event);
}
