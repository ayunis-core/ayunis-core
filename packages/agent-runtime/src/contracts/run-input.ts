import type { RunContext } from '../context/run-context';
import type { Hook } from './hook';
import type { Message } from './message';
import type {
  ModelProvider,
  ProviderFailureKind,
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
}

export interface RetryConfig {
  /** Calls after the initial call in one logical turn. */
  readonly maxRetries?: number;
  readonly retryableProviderFailureKinds?: readonly ProviderFailureKind[];
  readonly backoff?: Partial<RetryBackoffConfig>;
  readonly retryAfter?: Partial<RetryAfterConfig>;
}

export interface ResolvedRetryConfig {
  readonly maxRetries: number;
  readonly retryableProviderFailureKinds: readonly ProviderFailureKind[];
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
  backoff: Object.freeze({
    initialDelayMs: 500,
    multiplier: 2,
    maxDelayMs: 8_000,
    jitterRatio: 0,
  }),
  retryAfter: Object.freeze({
    precedence: 'retry_after',
    maxWaitMs: 15_000,
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
