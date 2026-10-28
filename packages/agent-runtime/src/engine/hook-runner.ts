import type { RunContext } from '../context/run-context';
import { AgentRuntimeError, HookFailedError } from '../contracts/errors';
import type { RunStatus, ToolCallSummary } from '../contracts/event';
import type {
  AfterModelCallContext,
  AfterModelTurnContext,
  AfterToolCallContext,
  Hook,
  HookApi,
  HookControlApi,
  ModelCallIdentity,
  ModelCallOutcome,
  ModelTurnOutcome,
  RunEndContext,
  ToolCallOutcome,
} from '../contracts/hook';
import type { Message } from '../contracts/message';
import type { ModelProvider, ToolChoice } from '../contracts/provider';
import type { Tool } from '../contracts/tool';
import type { EmitBuffer } from './event-queue';
import {
  immutableMessagesSnapshot,
  immutableModelCallOutcome,
  immutableModelTurnOutcome,
  immutableRuntimeError,
} from './immutable-outcome';
import { PendingMutations, type MutableRunConfig } from './mutations';
import {
  immutableToolsSnapshot,
  requestSnapshot,
  type ModelCallMode,
} from './request-snapshot';
import type { AbortState } from './run-state';

interface HookRunnerDeps {
  hooks: readonly Hook[];
  context: RunContext;
  mutations: PendingMutations;
  emits: EmitBuffer;
  abortState: AbortState;
}

export interface TerminalHookFailure {
  error: HookFailedError;
  critical: boolean;
}

export type RunEndFailure = TerminalHookFailure;

export class HookRunner {
  constructor(private readonly deps: HookRunnerDeps) {}

  get hooks(): readonly Hook[] {
    return this.deps.hooks;
  }

  async runStart(info: {
    messages: readonly Message[];
    instructions: string;
    tools: readonly Tool[];
  }): Promise<void> {
    const ctx = { ...this.api(this.deps.mutations), ...info };
    await this.runFailFast('runStart', (hook) => hook.runStart?.(ctx));
  }

  async beforeModelTurn(info: {
    iteration: number;
    turn: number;
    model: ModelProvider;
    messages: readonly Message[];
    instructions: string;
    tools: readonly Tool[];
  }): Promise<void> {
    const ctx = { ...this.api(this.deps.mutations), ...info };
    await this.runFailFast('beforeModelTurn', (hook) =>
      hook.beforeModelTurn?.(ctx),
    );
  }

  async beforeModelCall(info: {
    iteration: number;
    identity: ModelCallIdentity;
    config: MutableRunConfig;
    mode: ModelCallMode;
    toolChoice?: ToolChoice;
    signal: AbortSignal;
  }): Promise<MutableRunConfig> {
    const mutations = new PendingMutations();
    let config = info.config;
    for (const hook of this.deps.hooks) {
      if (!hook.beforeModelCall) continue;
      const request = requestSnapshot({
        config,
        mode: info.mode,
        toolChoice: info.toolChoice,
        signal: info.signal,
        sanitize: false,
      });
      const ctx = {
        ...this.api(mutations),
        ...info.identity,
        iteration: info.iteration,
        request,
        messages: request.messages,
        tools: immutableToolsSnapshot(config.tools),
      };
      await this.invoke(hook, 'beforeModelCall', () =>
        hook.beforeModelCall?.(ctx),
      );
      config = mutations.apply(config);
    }
    return config;
  }

  async afterModelCall(
    iteration: number,
    outcome: ModelCallOutcome,
  ): Promise<TerminalHookFailure[]> {
    const snapshot = immutableModelCallOutcome(outcome);
    const ctx: AfterModelCallContext = Object.freeze({
      ...this.controls(),
      ...snapshot,
      iteration,
      outcome: snapshot,
      message: snapshot.message,
      usage: snapshot.usage,
      finishReason: snapshot.finishReason,
    });
    return this.runTerminal(
      'afterModelCall',
      (hook) => hook.afterModelCall?.(ctx),
      (hook) => hook.afterModelCallFailureMode,
      outcome.type === 'provider_failure' ? outcome.error : undefined,
    );
  }

  async afterModelTurn(info: {
    iteration: number;
    turn: number;
    model: ModelProvider;
    outcome: ModelTurnOutcome;
    messages: readonly Message[];
  }): Promise<TerminalHookFailure[]> {
    const outcome = immutableModelTurnOutcome(info.outcome);
    const ctx: AfterModelTurnContext = Object.freeze({
      ...this.api(this.deps.mutations),
      ...info,
      messages: immutableMessagesSnapshot(info.messages),
      outcome,
    });
    const underlying =
      info.outcome.type === 'error' ? info.outcome.error : undefined;
    return this.runTerminal(
      'afterModelTurn',
      (hook) => hook.afterModelTurn?.(ctx),
      (hook) => hook.afterModelTurnFailureMode,
      underlying,
      info.outcome.type,
    );
  }

  async beforeToolCall(info: {
    iteration: number;
    toolCall: ToolCallSummary;
    findTool: (name: string) => Tool | undefined;
  }): Promise<ToolCallSummary> {
    let current = info.toolCall;
    const rewrite = (
      patch: Partial<Pick<ToolCallSummary, 'name' | 'input'>>,
    ): void => {
      current = { ...current, ...patch };
    };
    for (const hook of this.deps.hooks) {
      await this.invoke(hook, 'beforeToolCall', () =>
        hook.beforeToolCall?.({
          ...this.api(this.deps.mutations),
          iteration: info.iteration,
          toolCall: current,
          tool: info.findTool(current.name),
          rewriteToolCall: rewrite,
        }),
      );
    }
    return current;
  }

  async afterToolCall(info: {
    iteration: number;
    toolCall: ToolCallSummary;
    result: string;
    isError: boolean;
    outcome: ToolCallOutcome;
    isLastToolCall: boolean;
  }): Promise<void> {
    const ctx: AfterToolCallContext = {
      ...this.api(this.deps.mutations),
      ...info,
    };
    await this.runFailFast('afterToolCall', (hook) =>
      hook.afterToolCall?.(ctx),
    );
  }

  runEnd(info: {
    messages: readonly Message[];
    status: RunStatus;
    error?: AgentRuntimeError;
  }): Promise<RunEndFailure[]> {
    const error = info.error ? immutableRuntimeError(info.error) : undefined;
    const ctx: RunEndContext = Object.freeze({
      ...this.controls(),
      ...info,
      messages: immutableMessagesSnapshot(info.messages),
      error,
    });
    return this.runTerminal(
      'runEnd',
      (hook) => hook.runEnd?.(ctx),
      (hook) => hook.runEndFailureMode,
      info.error,
    );
  }

  private controls(): HookControlApi {
    const { context, emits, abortState } = this.deps;
    return {
      context,
      abort: (reason) => abortState.abort(reason),
      emit: (event) => emits.push(event),
    };
  }

  private api(mutations: PendingMutations): HookApi {
    return {
      ...this.controls(),
      transformMessages: (fn) => mutations.transformMessages(fn),
      addTools: (...tools) => mutations.addTools(...tools),
      removeTools: (...names) => mutations.removeTools(...names),
      setTools: (tools) => mutations.setTools(tools),
      addInstructions: (text) => mutations.addInstructions(text),
      setInstructions: (text) => mutations.setInstructions(text),
    };
  }

  private async runFailFast(
    phase: string,
    call: (hook: Hook) => void | Promise<void>,
  ): Promise<void> {
    for (const hook of this.deps.hooks) {
      await this.invoke(hook, phase, () => call(hook));
    }
  }

  private async runTerminal(
    phase: 'afterModelCall' | 'afterModelTurn' | 'runEnd',
    call: (hook: Hook) => void | Promise<void>,
    phaseMode: (hook: Hook) => Hook['terminalFailureMode'],
    underlyingError?: AgentRuntimeError,
    originalOutcome?: string,
  ): Promise<TerminalHookFailure[]> {
    const failures: TerminalHookFailure[] = [];
    for (const hook of this.deps.hooks) {
      try {
        await call(hook);
      } catch (cause) {
        failures.push({
          error: new HookFailedError({
            hookName: hook.name,
            phase,
            cause,
            ...(underlyingError ? { underlyingError } : {}),
            ...(originalOutcome ? { originalOutcome } : {}),
          }),
          critical:
            (phaseMode(hook) ?? hook.terminalFailureMode) !== 'best_effort',
        });
      }
    }
    return failures;
  }

  private async invoke(
    hook: Hook,
    phase: string,
    call: () => void | Promise<void>,
  ): Promise<void> {
    try {
      await call();
    } catch (error) {
      if (error instanceof AgentRuntimeError) throw error;
      throw new HookFailedError({ hookName: hook.name, phase, cause: error });
    }
  }
}
