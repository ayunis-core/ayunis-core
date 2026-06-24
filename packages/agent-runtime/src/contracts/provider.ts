/**
 * Re-export shim. The ModelProvider port and streaming chunk/request types
 * now live in @ayunis/inference (the shared contracts package). Kept here so
 * the engine's existing `../contracts/provider` imports stay valid.
 */
export type {
  FinishReason,
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
  ToolCallDelta,
  ToolChoice,
  Usage,
} from '@ayunis/inference';
