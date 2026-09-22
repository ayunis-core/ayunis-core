import type { RunContext } from '../context/run-context';
import type { AgentRuntimeError } from './errors';
import type {
  CustomEventInput,
  ModelCallTrigger,
  RunStatus,
  ToolCallSummary,
} from './event';
import type { AssistantMessage, Message } from './message';
import type {
  FinishReason,
  ModelProvider,
  ProviderFailureFacts,
  ProviderRequest,
  Usage,
} from './provider';
import type { Tool } from './tool';

export type ReadonlySnapshot<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends AbortSignal
    ? T
    : T extends readonly (infer Item)[]
      ? readonly ReadonlySnapshot<Item>[]
      : T extends object
        ? { readonly [Key in keyof T]: ReadonlySnapshot<T[Key]> }
        : T;

/** Controls whose effects are immediate in every hook phase. */
export interface HookControlApi {
  readonly context: RunContext;
  abort(reason?: string): void;
  emit(event: CustomEventInput): void;
}

/** Mutations persist in run, turn, and tool phases; before-call mutations are call-local. */
export interface HookApi extends HookControlApi {
  transformMessages(fn: (messages: readonly Message[]) => Message[]): void;
  addTools(...tools: Tool[]): void;
  removeTools(...names: string[]): void;
  setTools(tools: Tool[]): void;
  addInstructions(text: string): void;
  setInstructions(text: string): void;
}

export interface RunStartContext extends HookApi {
  readonly messages: readonly Message[];
  readonly instructions: string;
  readonly tools: readonly Tool[];
}

export interface BeforeModelTurnContext extends HookApi {
  readonly iteration: number;
  readonly turn: number;
  readonly model: ModelProvider;
  readonly messages: readonly Message[];
  readonly instructions: string;
  readonly tools: readonly Tool[];
}

export type { ModelCallTrigger } from './event';

export interface ModelCallIdentity {
  readonly modelCallId: string;
  readonly runId: string;
  /** One-based logical turn number. */
  readonly turn: number;
  /** One-based sequence within the logical turn. */
  readonly callSequence: number;
  readonly trigger: ModelCallTrigger;
  /** The actual provider used by this call, including in child runs. */
  readonly model: ModelProvider;
}

interface ModelCallOutcomeBase<
  MessageType,
  UsageType,
> extends ModelCallIdentity {
  readonly message: MessageType;
  readonly usage: UsageType;
  readonly finishReason: FinishReason;
  readonly outputState: 'partial' | 'final';
  readonly visibleOutput: boolean;
  readonly durationMs: number;
}

export type ModelCallRejectedReason =
  'empty' | 'malformed' | 'invalid_fallback';

type ModelCallOutcomeOf<MessageType, UsageType, ErrorType, FailureType> =
  | (ModelCallOutcomeBase<MessageType, UsageType> & {
      readonly type: 'accepted';
    })
  | (ModelCallOutcomeBase<MessageType, UsageType> & {
      readonly type: 'rejected';
      readonly reason: ModelCallRejectedReason;
      readonly error: ErrorType;
    })
  | (ModelCallOutcomeBase<MessageType, UsageType> & {
      readonly type: 'provider_failure';
      readonly error: ErrorType;
      readonly providerFailure: FailureType;
    })
  | (ModelCallOutcomeBase<MessageType, UsageType> & {
      readonly type: 'aborted';
      readonly error: ErrorType;
    })
  | (ModelCallOutcomeBase<MessageType, UsageType> & {
      readonly type: 'consumer_abandoned';
    });

export type ModelCallOutcome = ModelCallOutcomeOf<
  AssistantMessage,
  Usage,
  AgentRuntimeError,
  ProviderFailureFacts
>;

export type ModelCallOutcomeSnapshot = ModelCallOutcomeOf<
  ReadonlySnapshot<AssistantMessage>,
  ReadonlySnapshot<Usage>,
  ReadonlySnapshot<AgentRuntimeError>,
  ReadonlySnapshot<ProviderFailureFacts>
>;

export interface BeforeModelCallContext extends HookApi, ModelCallIdentity {
  /** Zero-based alias retained for compatibility. */
  readonly iteration: number;
  /** Immutable request state as transformed by preceding call hooks. */
  readonly request: ReadonlySnapshot<ProviderRequest>;
  readonly messages: readonly ReadonlySnapshot<Message>[];
  readonly tools: readonly ReadonlySnapshot<Tool>[];
}

export interface AfterModelCallContext
  extends HookControlApi, ModelCallIdentity {
  readonly iteration: number;
  readonly outcome: ModelCallOutcomeSnapshot;
  /** Compatibility projections; use `outcome` for new integrations. */
  readonly message: ReadonlySnapshot<AssistantMessage>;
  readonly usage: ReadonlySnapshot<Usage>;
  readonly finishReason: FinishReason;
}

type ModelTurnOutcomeOf<CallType, ErrorType> =
  | { readonly type: 'accepted'; readonly call: CallType }
  | {
      readonly type: 'error';
      readonly error: ErrorType;
      readonly call?: CallType;
    }
  | { readonly type: 'aborted'; readonly call?: CallType }
  | {
      readonly type: 'consumer_abandoned';
      readonly call?: CallType;
    };

export type ModelTurnOutcome = ModelTurnOutcomeOf<
  ModelCallOutcome,
  AgentRuntimeError
>;

export type ModelTurnOutcomeSnapshot = ModelTurnOutcomeOf<
  ModelCallOutcomeSnapshot,
  ReadonlySnapshot<AgentRuntimeError>
>;

export interface AfterModelTurnContext extends HookApi {
  readonly iteration: number;
  readonly turn: number;
  readonly model: ModelProvider;
  readonly outcome: ModelTurnOutcomeSnapshot;
  readonly messages: readonly ReadonlySnapshot<Message>[];
}

/** Deprecated compatibility type; use `afterModelCall` outcomes. */
export type ModelCallInterruptionReason =
  'aborted' | 'error' | 'consumer_abandoned';

/** Deprecated compatibility type; use `AfterModelCallContext`. */
export interface ModelCallInterruptedContext extends HookApi {
  readonly iteration: number;
  readonly message: AssistantMessage;
  readonly reason: ModelCallInterruptionReason;
}

export interface BeforeToolCallContext extends HookApi {
  readonly iteration: number;
  readonly toolCall: ToolCallSummary;
  readonly tool: Tool | undefined;
  rewriteToolCall(patch: {
    name?: string;
    input?: Record<string, unknown>;
  }): void;
}

export type ToolCallOutcome = 'success' | 'error' | 'aborted';

export interface AfterToolCallContext extends HookApi {
  readonly iteration: number;
  readonly toolCall: ToolCallSummary;
  readonly result: string;
  readonly isError: boolean;
  readonly outcome: ToolCallOutcome;
  readonly isLastToolCall: boolean;
}

export interface RunEndContext extends HookControlApi {
  readonly messages: readonly ReadonlySnapshot<Message>[];
  readonly status: RunStatus;
  readonly error?: ReadonlySnapshot<AgentRuntimeError>;
}

export type TerminalHookFailureMode = 'critical' | 'best_effort';

/** Hooks run sequentially in registration order and inherit into child runs by default. */
export interface Hook {
  readonly name: string;
  /** Set false when this hook owns root-run-only state or side effects. Defaults to true. */
  readonly inheritToChildRuns?: boolean;
  /** Default for terminal phases when a phase-specific mode is omitted. */
  readonly terminalFailureMode?: TerminalHookFailureMode;
  readonly afterModelCallFailureMode?: TerminalHookFailureMode;
  readonly afterModelTurnFailureMode?: TerminalHookFailureMode;
  /** Deprecated phase-specific alias for `terminalFailureMode`. */
  readonly runEndFailureMode?: TerminalHookFailureMode;
  runStart?(ctx: RunStartContext): void | Promise<void>;
  beforeModelTurn?(ctx: BeforeModelTurnContext): void | Promise<void>;
  beforeModelCall?(ctx: BeforeModelCallContext): void | Promise<void>;
  afterModelCall?(ctx: AfterModelCallContext): void | Promise<void>;
  afterModelTurn?(ctx: AfterModelTurnContext): void | Promise<void>;
  /** Deprecated and no longer invoked; use `afterModelCall`. */
  modelCallInterrupted?(ctx: ModelCallInterruptedContext): void | Promise<void>;
  beforeToolCall?(ctx: BeforeToolCallContext): void | Promise<void>;
  afterToolCall?(ctx: AfterToolCallContext): void | Promise<void>;
  runEnd?(ctx: RunEndContext): void | Promise<void>;
}
