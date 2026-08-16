import type {
  AfterModelCallContext,
  AfterToolCallContext,
  BeforeModelCallContext,
  BeforeToolCallContext,
  Hook,
  ModelCallInterruptedContext,
  RunContext,
  RunEndContext,
  RunStartContext,
} from '@ayunis/agent-runtime';

type HookContext =
  | RunStartContext
  | BeforeModelCallContext
  | AfterModelCallContext
  | ModelCallInterruptedContext
  | BeforeToolCallContext
  | AfterToolCallContext
  | RunEndContext;

type BeforeInvoke = (context: HookContext) => void;

export const wrapHook = (
  hook: Hook,
  expected: RunContext,
  beforeInvoke: BeforeInvoke,
): Hook => ({
  name: hook.name,
  ...(hook.runEndFailureMode === undefined
    ? {}
    : { runEndFailureMode: hook.runEndFailureMode }),
  ...wrapRunPhases(hook, expected, beforeInvoke),
  ...wrapModelPhases(hook, expected, beforeInvoke),
  ...wrapToolPhases(hook, expected, beforeInvoke),
});

const wrapRunPhases = (
  hook: Hook,
  expected: RunContext,
  beforeInvoke: BeforeInvoke,
): Partial<Hook> => ({
  ...(hook.runStart
    ? {
        runStart: guard(expected, beforeInvoke, (ctx) => hook.runStart?.(ctx)),
      }
    : {}),
  ...(hook.runEnd
    ? { runEnd: guard(expected, beforeInvoke, (ctx) => hook.runEnd?.(ctx)) }
    : {}),
});

const wrapModelPhases = (
  hook: Hook,
  expected: RunContext,
  beforeInvoke: BeforeInvoke,
): Partial<Hook> => ({
  ...(hook.beforeModelCall
    ? {
        beforeModelCall: guard(expected, beforeInvoke, (ctx) =>
          hook.beforeModelCall?.(ctx),
        ),
      }
    : {}),
  ...(hook.afterModelCall
    ? {
        afterModelCall: guard(expected, beforeInvoke, (ctx) =>
          hook.afterModelCall?.(ctx),
        ),
      }
    : {}),
  ...(hook.modelCallInterrupted
    ? {
        modelCallInterrupted: guard(expected, beforeInvoke, (ctx) =>
          hook.modelCallInterrupted?.(ctx),
        ),
      }
    : {}),
});

const wrapToolPhases = (
  hook: Hook,
  expected: RunContext,
  beforeInvoke: BeforeInvoke,
): Partial<Hook> => ({
  ...(hook.beforeToolCall
    ? {
        beforeToolCall: guard(expected, beforeInvoke, (ctx) =>
          hook.beforeToolCall?.(ctx),
        ),
      }
    : {}),
  ...(hook.afterToolCall
    ? {
        afterToolCall: guard(expected, beforeInvoke, (ctx) =>
          hook.afterToolCall?.(ctx),
        ),
      }
    : {}),
});

const guard = <Context extends HookContext>(
  expected: RunContext,
  beforeInvoke: BeforeInvoke,
  invoke: (context: Context) => void | Promise<void>,
): ((context: Context) => void | Promise<void>) => {
  return (context) => {
    if (context.context !== expected) {
      throw new Error(
        'A run-scoped extension hook was invoked with a different runtime context.',
      );
    }
    beforeInvoke(context);
    return invoke(context);
  };
};
