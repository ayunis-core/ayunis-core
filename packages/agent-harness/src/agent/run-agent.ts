import {
  RunContext,
  run,
  type ChildRunHandler,
  type Hook,
  type Message,
  type ModelProvider,
  type RunEvent,
  type Tool,
  type ToolChoice,
} from '@ayunis/agent-runtime';

import type { AgentRunInput } from '../contracts/agent';
import { ModelResolutionError } from '../contracts/errors';
import type { PreparedAgentConfig } from './agent-config';
import { createRunFinalizer, finalizeRun } from './finalize-run';
import { ExtensionEngine } from '../extensions/extension-engine';

interface ConfiguredRunInput {
  readonly instructions: string;
  readonly model: ModelProvider;
  readonly messages: readonly Message[];
  readonly tools?: readonly Tool[];
  readonly hooks?: readonly Hook[];
  readonly context: RunContext;
  readonly signal?: AbortSignal;
  readonly maxIterations?: number;
  readonly toolChoice?: ToolChoice;
}

export async function* runAgent<ModelSelector>(
  config: PreparedAgentConfig<ModelSelector>,
  input: AgentRunInput,
): AsyncGenerator<RunEvent> {
  const context = input.context ?? RunContext.create();
  const model = await resolveModel(config, context, input.signal);
  yield* runConfigured(config, {
    instructions: config.instructions,
    model,
    messages: input.messages,
    tools: input.tools,
    context,
    signal: input.signal,
    maxIterations: config.maxIterations,
    toolChoice: config.toolChoice,
  });
}

const resolveModel = async <ModelSelector>(
  config: PreparedAgentConfig<ModelSelector>,
  context: RunContext,
  signal?: AbortSignal,
): Promise<ModelProvider> => {
  try {
    const resolutionContext = signal ? { context, signal } : { context };
    return await config.resolveModel(config.modelSelector, resolutionContext);
  } catch (error) {
    throw new ModelResolutionError(config.name, error);
  }
};

const runConfigured = async function* <ModelSelector>(
  config: PreparedAgentConfig<ModelSelector>,
  input: ConfiguredRunInput,
): AsyncGenerator<RunEvent> {
  const engine = await ExtensionEngine.create(config.extensions, input.context);
  const finalizer = createRunFinalizer(() => engine.dispose());
  try {
    const composition = engine.compose({
      instructions: input.instructions,
      tools: input.tools ?? [],
    });
    const childRunHandler = createChildRunHandler(config);
    const events = run({
      instructions: composition.instructions,
      model: input.model,
      messages: [...input.messages],
      tools: [...composition.tools],
      hooks: [...(input.hooks ?? []), ...composition.hooks],
      context: input.context,
      childRunHandler,
      ...(input.signal ? { signal: input.signal } : {}),
      ...(input.maxIterations === undefined
        ? {}
        : { maxIterations: input.maxIterations }),
      ...(input.toolChoice === undefined
        ? {}
        : { toolChoice: input.toolChoice }),
    });
    yield* finalizeRun(events, finalizer);
  } finally {
    await finalizer.finalize();
  }
};

const createChildRunHandler = <ModelSelector>(
  config: PreparedAgentConfig<ModelSelector>,
): ChildRunHandler => {
  return (input) =>
    runConfigured(config, {
      ...input,
      context: input.context ?? RunContext.create(),
      maxIterations: input.maxIterations ?? config.maxIterations,
      toolChoice: input.toolChoice ?? config.toolChoice,
    });
};
