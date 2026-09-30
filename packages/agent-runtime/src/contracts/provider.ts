/**
 * Re-export shim. Provider contracts live in @ayunis/inference; the runtime
 * also exposes them so hosts need only one package for the complete API.
 */
export { ModelProviderError } from '@ayunis/inference';
export type {
  FinishReason,
  ModelProvider,
  ModelProviderErrorDetails,
  ProviderChunk,
  ProviderFailureKind,
  ProviderFailureStage,
  ProviderRequest,
  ProviderTimeoutSource,
  ToolCallDelta,
  ToolChoice,
  Usage,
} from '@ayunis/inference';

import type {
  ProviderFailureKind,
  ProviderFailureStage,
  ProviderTimeoutSource,
} from '@ayunis/inference';

/** Safe, serializable provider failure facts retained by the runtime. */
export interface ProviderFailureFacts {
  readonly kind: ProviderFailureKind;
  readonly stage: ProviderFailureStage;
  readonly upstreamStatus?: number;
  readonly upstreamRequestId?: string;
  readonly retryAfterMs?: number;
  readonly timeoutSource?: ProviderTimeoutSource;
  readonly transportCode?: string;
  readonly host?: string;
}
