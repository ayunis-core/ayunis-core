import { DEFAULT_RETRY_CONFIG, type RetryConfig } from '@ayunis/agent-runtime';

// A provider may still reject a trimmed request as too long, since it counts
// with its own tokenizer. ContextBudgetHookFactory then trims more history
// and the runtime retries the call (AYC-1255).
export const RUN_RETRY_CONFIG: RetryConfig = {
  ...DEFAULT_RETRY_CONFIG,
  retryableRejectionReasons: ['context_length_exceeded'],
};
