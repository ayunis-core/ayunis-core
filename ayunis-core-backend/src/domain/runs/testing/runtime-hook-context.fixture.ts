import {
  AgentRuntimeError,
  RunContext,
  type AfterModelCallContext,
  type BeforeModelCallContext,
  type BeforeModelTurnContext,
  type HookApi,
  type ModelCallOutcome,
  type ProviderFailureFacts,
  type Usage,
} from '@ayunis/agent-runtime';

function hookApi(context = RunContext.create()): HookApi {
  return {
    context,
    abort: jest.fn(),
    emit: jest.fn(),
    transformMessages: jest.fn(),
    addTools: jest.fn(),
    removeTools: jest.fn(),
    setTools: jest.fn(),
    addInstructions: jest.fn(),
    setInstructions: jest.fn(),
  };
}

export function turnContext(
  overrides: Partial<BeforeModelTurnContext> = {},
): BeforeModelTurnContext {
  return {
    ...hookApi(),
    iteration: 0,
    turn: 1,
    model: { name: 'mock', stream: jest.fn() },
    messages: [],
    instructions: '',
    tools: [],
    ...overrides,
  };
}

export function callContext(
  overrides: Partial<BeforeModelCallContext> = {},
): BeforeModelCallContext {
  return {
    ...hookApi(),
    iteration: 0,
    turn: 1,
    callSequence: 1,
    trigger: 'initial',
    modelCallId: 'call-1',
    runId: 'run-1',
    model: { name: 'mock', stream: jest.fn() },
    request: { instructions: '', messages: [], tools: [] },
    messages: [],
    tools: [],
    ...overrides,
  };
}

export function callOutcome(
  options: { usage?: Usage; failure?: ProviderFailureFacts } = {},
): ModelCallOutcome {
  const identity = callContext();
  const base = {
    modelCallId: identity.modelCallId,
    runId: identity.runId,
    model: identity.model,
    turn: identity.turn,
    callSequence: identity.callSequence,
    trigger: identity.trigger,
    message: { role: 'assistant' as const, content: [] },
    usage: options.usage ?? {},
    finishReason: null,
    outputState: 'final' as const,
    providerConsumptionStarted: false,
    producedOutput: false,
    visibleOutput: false,
    durationMs: 0,
  };
  return options.failure
    ? {
        ...base,
        type: 'provider_failure',
        providerFailure: options.failure,
        error: new AgentRuntimeError(
          'PROVIDER_FAILED',
          'Provider rejected the request',
        ),
      }
    : { ...base, type: 'accepted' };
}

export function afterCallContext(
  overrides: Partial<AfterModelCallContext> = {},
): AfterModelCallContext {
  const identity = callContext();
  const outcome = overrides.outcome ?? callOutcome();
  return {
    context: identity.context,
    abort: jest.fn(),
    emit: jest.fn(),
    modelCallId: identity.modelCallId,
    runId: identity.runId,
    turn: identity.turn,
    callSequence: identity.callSequence,
    trigger: identity.trigger,
    model: identity.model,
    iteration: 0,
    outcome,
    message: outcome.message,
    usage: outcome.usage,
    finishReason: outcome.finishReason,
    ...overrides,
  };
}
