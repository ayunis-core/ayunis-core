import type { RetryConfig } from '@ayunis/agent-runtime';

// A provider may still reject a trimmed request as too long, since it counts
// with its own tokenizer. ContextBudgetHookFactory then trims more history
// and the runtime retries the call (AYC-1255).
export const RUN_RETRY_CONFIG = {
  retryableRejectionReasons: ['context_length_exceeded'],
  // Azure's guidance for 429s is to wait its retry-after-ms when present and
  // otherwise back off with random jitter, because failed requests still count
  // against the per-minute quota (learn.microsoft.com/azure/foundry/openai/
  // how-to/quota, "Rate limit best practices"; @ayunis/inference reads
  // retry-after-ms first, then retry-after). maxWaitMs covers every Retry-After
  // seen in production (AYC-1268: 0.2 to 29 s). Do not raise it to absorb
  // sustained throttling: a longer wait only delays the same demand, and the
  // fix for that is deployment TPM (AYC-1269). jitterMs only spreads calls that
  // were throttled in the same second; 2 s does that and is invisible next to
  // a 20 s wait.
  retryAfter: { maxWaitMs: 30_000, jitterMs: 2_000 },
} satisfies RetryConfig;
