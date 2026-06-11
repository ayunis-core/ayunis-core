import type { RunContext } from '../context/run-context';
import { HookFailedError } from '../contracts/errors';
import type { AgentRuntimeError } from '../contracts/errors';
import type { RunStatus, ToolCallSummary } from '../contracts/event';
import type {
  AfterModelCallContext,
  AfterToolCallContext,
  Hook,
  HookApi,
} from '../contracts/hook';
import type { AssistantMessage, Message } from '../contracts/message';
import type { FinishReason, Usage } from '../contracts/provider';
import type { Tool } from '../contracts/tool';
import type { EmitBuffer } from './event-queue';
import type { PendingMutations } from './mutations';
import type { AbortState } from './run-state';

interface HookRunnerDeps {
  hooks: readonly Hook[];
  context: RunContext;
  mutations: PendingMutations;
  emits: EmitBuffer;
  abortState: AbortState;
}

/**
 * Fires hook phases in registration order, awaited sequentially. Builds
 * the shared mutation API each phase context extends.
 */
export class HookRunner {
  constructor(private readonly deps: HookRunnerDeps) {}

  get hooks(): readonly Hook[] {
    return this.deps.hooks;
  }

  private api(): HookApi {
    const { context, mutations, emits, abortState } = this.deps;
    return {
      context,
      transformMessages: (fn) => mutations.transformMessages(fn),
      addTools: (...tools) => mutations.addTools(...tools),
      removeTools: (...names) => mutations.removeTools(...names),
      setTools: (tools) => mutations.setTools(tools),
      addInstructions: (text) => mutations.addInstructions(text),
      abort: (reason) => abortState.abort(reason),
      emit: (event) => emits.push(event),
    };
  }

  async runStart(info: {
    messages: readonly Message[];
    instructions: string;
    tools: readonly Tool[];
  }): Promise<void> {
    const ctx = { ...this.api(), ...info };
    for (const hook of this.deps.hooks) {
      await this.invoke(hook, 'runStart', () => hook.runStart?.(ctx));
    }
  }

  async beforeModelCall(info: {
    iteration: number;
    messages: readonly Message[];
    tools: readonly Tool[];
  }): Promise<void> {
    const ctx = { ...this.api(), ...info };
    for (const hook of this.deps.hooks) {
      await this.invoke(hook, 'beforeModelCall', () =>
        hook.beforeModelCall?.(ctx),
      );
    }
  }

  async afterModelCall(info: {
    iteration: number;
    message: AssistantMessage;
    usage: Usage;
    finishReason: FinishReason;
  }): Promise<void> {
    const ctx: AfterModelCallContext = { ...this.api(), ...info };
    for (const hook of this.deps.hooks) {
      await this.invoke(hook, 'afterModelCall', () =>
        hook.afterModelCall?.(ctx),
      );
    }
  }

  /** Returns the (possibly rewritten) tool call to execute. */
  async beforeToolCall(info: {
    iteration: number;
    toolCall: ToolCallSummary;
    findTool: (name: string) => Tool | undefined;
  }): Promise<ToolCallSummary> {
    let current = info.toolCall;
    const rewriteToolCall = (patch: {
      name?: string;
      input?: Record<string, unknown>;
    }): void => {
      current = { ...current, ...patch };
    };
    for (const hook of this.deps.hooks) {
      await this.invoke(hook, 'beforeToolCall', () =>
        hook.beforeToolCall?.({
          ...this.api(),
          iteration: info.iteration,
          toolCall: current,
          tool: info.findTool(current.name),
          rewriteToolCall,
        }),
      );
    }
    return current;
  }

  /** Wraps a hook failure with the hook's name and phase for attribution. */
  private async invoke(
    hook: Hook,
    phase: string,
    call: () => void | Promise<void>,
  ): Promise<void> {
    try {
      await call();
    } catch (error) {
      throw new HookFailedError({ hookName: hook.name, phase, cause: error });
    }
  }

  async afterToolCall(info: {
    iteration: number;
    toolCall: ToolCallSummary;
    result: string;
    isError: boolean;
  }): Promise<void> {
    const ctx: AfterToolCallContext = { ...this.api(), ...info };
    for (const hook of this.deps.hooks) {
      await this.invoke(hook, 'afterToolCall', () => hook.afterToolCall?.(ctx));
    }
  }

  async runEnd(info: {
    messages: readonly Message[];
    status: RunStatus;
    error?: AgentRuntimeError;
  }): Promise<void> {
    const ctx = { ...this.api(), ...info };
    for (const hook of this.deps.hooks) {
      await this.invoke(hook, 'runEnd', () => hook.runEnd?.(ctx));
    }
  }
}
