import {
  listClientToolCalls,
  type ClientToolMessage,
} from './client-tool-messages';
import type {
  ClientToolCall,
  ClientToolExecutor,
  ClientToolRegistration,
} from './client-tools';
import type { RunMessagePayload } from './run-endpoints';

export type ClientToolResult = NonNullable<RunMessagePayload['toolResult']>;

export interface ClientToolDispatch<Context, Outcome> {
  readonly registry: ReadonlyMap<
    string,
    ClientToolRegistration<Context, Outcome>
  >;
  readonly invoke: (
    execute: ClientToolExecutor<Context, Outcome>,
    call: ClientToolCall,
    signal: AbortSignal,
  ) => Promise<string | undefined>;
  /** A changed context cancels outstanding work, even on the same thread. */
  readonly contextKey?: unknown;
  /** The default is a tool whose result continues the run. */
  readonly expectsResult?: (call: ClientToolCall) => boolean;
  /** A surface may restrict automatic execution, for example for explicit UI actions. */
  readonly shouldExecute?: (call: ClientToolCall) => boolean;
  /** Called when the view opens. Return true to resume an unanswered read. */
  readonly resumeOnOpen?: () => boolean;
  readonly onBeginRun?: (takesOverStartedRun: boolean) => void;
  /** Called before evaluating a batch, for surface-specific context checks. */
  readonly canDispatch?: () => boolean;
  readonly onCalls?: (calls: readonly ClientToolCall[]) => void;
}

export function registeredCalls<Context, Outcome>(
  messages: readonly ClientToolMessage[],
  dispatch: ClientToolDispatch<Context, Outcome>,
) {
  return listClientToolCalls(messages).filter(({ name }) =>
    Boolean(dispatch.registry.get(name)?.execute),
  );
}

export function expectsResult<Context, Outcome>(
  call: ClientToolCall,
  dispatch: ClientToolDispatch<Context, Outcome>,
): boolean {
  return dispatch.expectsResult?.(call) ?? true;
}

/** The current run protocol accepts one client result per continuation. */
export async function executeToolBatch<Context, Outcome>(
  calls: readonly ClientToolCall[],
  dispatch: ClientToolDispatch<Context, Outcome>,
  signal: AbortSignal,
): Promise<ClientToolResult | undefined> {
  let next: ClientToolResult | undefined;
  for (const call of calls) {
    if (signal.aborted) return;
    const execute = dispatch.registry.get(call.name)?.execute;
    const sendsResult = expectsResult(call, dispatch);
    if (
      !execute ||
      !canInvoke(call, dispatch, sendsResult && next !== undefined)
    )
      continue;
    const result = await dispatch.invoke(execute, call, signal);
    if (sendsResult && result !== undefined) {
      next = { toolId: call.id, toolName: call.name, result };
    }
  }
  return next;
}

function canInvoke<Context, Outcome>(
  call: ClientToolCall,
  dispatch: ClientToolDispatch<Context, Outcome>,
  resultAlreadySelected: boolean,
): boolean {
  return !resultAlreadySelected && dispatch.shouldExecute?.(call) !== false;
}
