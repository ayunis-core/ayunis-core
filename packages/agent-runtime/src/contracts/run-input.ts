import type { RunContext } from '../context/run-context';
import type { Hook } from './hook';
import type { Message } from './message';
import type {
  ModelProvider,
  ProviderFailureKind,
  ProviderRejectionReason,
  ToolChoice,
} from './provider';
import type { Tool } from './tool';

export const DEFAULT_MAX_ITERATIONS = 20;
export const DEFAULT_MODEL_CALL_IDLE_TIMEOUT_MS = 180_000;

export interface RetryBackoffConfig {
  readonly initialDelayMs: number;
  readonly multiplier: number;
  readonly maxDelayMs: number;
  /** Symmetric random variation from 0 through 1. */
  readonly jitterRatio: number;
}

export type RetryAfterPrecedence = 'retry_after' | 'backoff';

export interface RetryAfterConfig {
  readonly precedence: RetryAfterPrecedence;
  /** Retry-After values above this limit make the failure terminal. */
  readonly maxWaitMs: number;
  /**
   * Upper bound of the random wait added on top of an honoured Retry-After,
   * so that calls rate-limited together do not all re-fire in the same
   * second. The spread is never subtracted and does not count toward
   * `maxWaitMs`.
   */
  readonly jitterMs: number;
}

export interface RetryConfig {
  /** Calls after the initial call in one logical turn. */
  readonly maxRetries?: number;
  readonly retryableProviderFailureKinds?: readonly ProviderFailureKind[];
  /**
   * Rejections retried immediately, without backoff, because the host changes
   * the request in `beforeModelCall` (for example by trimming history after a
   * `context_length_exceeded` rejection). Empty by default.
   */
  readonly retryableRejectionReasons?: readonly ProviderRejectionReason[];
  readonly backoff?: Partial<RetryBackoffConfig>;
  readonly retryAfter?: Partial<RetryAfterConfig>;
}

export interface ResolvedRetryConfig {
  readonly maxRetries: number;
  readonly retryableProviderFailureKinds: readonly ProviderFailureKind[];
  readonly retryableRejectionReasons: readonly ProviderRejectionReason[];
  readonly backoff: Readonly<RetryBackoffConfig>;
  readonly retryAfter: Readonly<RetryAfterConfig>;
}

export const DEFAULT_RETRY_CONFIG: ResolvedRetryConfig = Object.freeze({
  maxRetries: 3,
  retryableProviderFailureKinds: Object.freeze([
    'connection',
    'timeout',
    'server',
    'rate_limit',
  ] satisfies ProviderFailureKind[]),
  retryableRejectionReasons: Object.freeze(
    [] satisfies ProviderRejectionReason[],
  ),
  backoff: Object.freeze({
    initialDelayMs: 500,
    multiplier: 2,
    maxDelayMs: 8_000,
    jitterRatio: 0,
  }),
  // Honouring a provider's Retry-After and spreading it is standard practice,
  // because failed requests still count against the provider's quota. Azure
  // documents exactly this (learn.microsoft.com/azure/foundry/openai/how-to/
  // quota, "Rate limit best practices": use retry-after-ms if present,
  // otherwise exponential backoff with random jitter). maxWaitMs covers every
  // Retry-After seen in Ayunis production (AYC-1268: 0.2 to 29 s). Do not
  // raise it to absorb sustained throttling: a longer wait only delays the
  // same demand, and the fix for that is provider quota (AYC-1269). jitterMs
  // only spreads calls throttled in the same second; 2 s does that and is
  // invisible next to a 20 s wait.
  retryAfter: Object.freeze({
    precedence: 'retry_after',
    maxWaitMs: 30_000,
    jitterMs: 2_000,
  }),
});

/** Everything required for one root or child agent run. */
export interface RunInput {
  instructions: string;
  model: ModelProvider;
  tools?: Tool[];
  messages: Message[];
  hooks?: Hook[];
  context?: RunContext;
  signal?: AbortSignal;
  maxIterations?: number;
  toolChoice?: ToolChoice;
  /** Provider and semantic recovery share this one per-turn retry budget. */
  retry?: RetryConfig;
  /** Maximum silence between provider chunks for each model call. */
  modelCallIdleTimeoutMs?: number;
}

export type ChildRunInput = Omit<RunInput, 'context'>;
