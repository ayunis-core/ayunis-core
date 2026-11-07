const CREDIT_REASONS = new Set([
  'CREDIT_BUDGET_EXCEEDED',
  'USER_CREDIT_LIMIT_EXCEEDED',
  'TEAM_CREDIT_LIMIT_EXCEEDED',
  'QUOTA_EXCEEDED',
]);

const MODEL_REASONS = new Set([
  'UNAUTHORIZED_ACCESS',
  'MODEL_NOT_FOUND',
  'RUN_NO_MODEL_FOUND',
]);

const KNOWN_REASONS: Readonly<Record<string, string>> = {
  finish_routine_not_called: 'finishNotCalled',
  timeout: 'timeout',
  interrupted: 'interrupted',
  ACADEMY_CERTIFICATE_REQUIRED: 'academyCertificate',
  ROUTINE_SUBSCRIPTION_REQUIRED: 'subscriptionRequired',
  ROUTINE_OWNER_LOCKED: 'ownerLocked',
  RUN_MAX_ITERATIONS_REACHED: 'maxIterations',
};

/** The `failureReason.*` translation key for a stored failure reason code. */
export function failureReasonKey(reason: string | null): string {
  if (reason === null) return 'failureReason.unknown';
  if (CREDIT_REASONS.has(reason)) return 'failureReason.credits';
  if (MODEL_REASONS.has(reason)) return 'failureReason.model';
  return `failureReason.${KNOWN_REASONS[reason] ?? 'unknown'}`;
}
