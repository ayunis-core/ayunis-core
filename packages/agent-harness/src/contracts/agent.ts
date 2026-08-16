import type { ConfiguredExtension } from '@ayunis/agent-extensions';
import type {
  Message,
  RunContext,
  RunEvent,
  Tool,
  ToolChoice,
} from '@ayunis/agent-runtime';

import type { ModelResolver } from './model-resolver';

export interface AgentConfig<ModelSelector = unknown> {
  readonly name: string;
  readonly instructions: string;
  readonly extensions?: readonly ConfiguredExtension[];
  readonly modelSelector: ModelSelector;
  readonly resolveModel: ModelResolver<ModelSelector>;
  readonly maxIterations?: number;
  readonly toolChoice?: ToolChoice;
}

export interface AgentVariantConfig {
  readonly name: string;
  readonly instructions?: string;
  readonly extensions?: readonly ConfiguredExtension[];
}

export interface AgentRunInput {
  readonly messages: readonly Message[];
  readonly tools?: readonly Tool[];
  readonly context?: RunContext;
  readonly signal?: AbortSignal;
}

export interface Agent<ModelSelector = unknown> {
  readonly name: string;
  variant(config: AgentVariantConfig): Agent<ModelSelector>;
  run(input: AgentRunInput): AsyncIterable<RunEvent>;
}
