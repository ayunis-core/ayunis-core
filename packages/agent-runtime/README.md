# @ayunis/agent-runtime

An independent TypeScript agent loop with provider, hook, tool, and event
contracts. The host resolves the model and supplies it directly:

```ts
import { run } from '@ayunis/agent-runtime';

for await (const event of run({
  instructions: 'You are a helpful assistant.',
  model,
  tools,
  messages,
  hooks,
})) {
  // text/thinking/tool snapshots, accepted messages, errors, and run_end
}
```

The runtime has no framework object or initialization step. Persistence,
model selection and credentials, tenancy, diagnostics, and telemetry remain
host concerns implemented through hooks and `RunContext`.

## Turns, calls, and retries

A **model turn** starts after the preceding tool phase and ends with an accepted
response or a terminal outcome. Every invocation of `ModelProvider.stream()`
is a distinct **model call**. Provider retries, empty-response recovery,
malformed-tool recovery, and the tool-disabled fallback are new calls in the
same turn.

`RunInput.retry.maxRetries` is the one shared budget for all calls after the
initial call. It defaults to 3, so a turn opens at most four calls. Together
with `maxIterations`, this gives the run its hard model-call bound; there is no
second semantic or run-wide retry ceiling.

```ts
import { DEFAULT_RETRY_CONFIG, run } from '@ayunis/agent-runtime';

run({
  // ...
  retry: {
    maxRetries: 3,
    retryableProviderFailureKinds: [
      'connection',
      'timeout',
      'server',
      'rate_limit',
    ],
    backoff: {
      initialDelayMs: 500,
      multiplier: 2,
      maxDelayMs: 8_000,
      jitterRatio: 0,
    },
    retryAfter: {
      precedence: 'retry_after', // or 'backoff'
      maxWaitMs: 15_000,
    },
  },
});
```

`DEFAULT_RETRY_CONFIG` exports those documented defaults. Every field is
optional in `RunInput.retry` and is validated synchronously. A provider
`Retry-After` above `maxWaitMs` is not clamped: the failure is terminal rather
than keeping an interactive stream open beyond the accepted wait. With
`precedence: 'backoff'`, valid Retry-After values do not replace the configured
backoff. Child runs inherit their parent's resolved policy and may override any
part of it. The 500 ms initial delay avoids an immediate repeat request, the
factor of two gives transient failures progressively more recovery time, and
the 8 second cap keeps an interactive retry bounded. Jitter is disabled by
default so retry timing remains deterministic and preserves prior host
behavior; deployments that need request spreading can opt in explicitly.

The runtime never retries after text, thinking, or tool-call snapshots have
been emitted, after cancellation, or after a critical terminal hook failure.
Usage and finish metadata are not visible output. Hook-emitted custom events do
not make provider replay unsafe; hooks that emit call-local events must make
them idempotent.

## Lifecycle hooks

Hooks run sequentially in registration order.

| Phase             | Frequency                     | Typical use                                     |
| ----------------- | ----------------------------- | ----------------------------------------------- |
| `runStart`        | once                          | guards and initial run-state mutation           |
| `beforeModelTurn` | once per logical turn         | persistent message/tool/instruction transforms  |
| `beforeModelCall` | before every actual call      | authorization and call-local request transforms |
| `afterModelCall`  | exactly once per started call | usage persistence, diagnostics, telemetry       |
| `afterModelTurn`  | exactly once per turn         | accepted/partial message persistence            |
| `beforeToolCall`  | once per tool call            | approval and tool-call rewriting                |
| `afterToolCall`   | once per tool call            | result persistence and next-turn mutation       |
| `runEnd`          | exactly once                  | run-scoped cleanup and terminal telemetry       |

Every call has a stable `modelCallId`, run ID, one-based turn and call sequence,
trigger, and the actual `ModelProvider`. `afterModelCall` receives a
discriminated outcome: `accepted`, `rejected` (`empty`, `malformed`, or
`invalid_fallback`), `provider_failure`, `aborted`, or
`consumer_abandoned`. Outcomes include usage, partial/final message state,
finish reason, visible-output state, duration, normalized error where
applicable, and provider failure facts. Terminal hooks share one frozen
outcome context with deeply isolated and frozen output, usage, error, and
provider-fact data, so no hook can rewrite canonical values observed by later
hooks or the run. `afterModelTurn` and `runEnd` likewise receive deeply isolated,
frozen message snapshots. Their public types mirror that deep immutability.

`afterModelCall` and `runEnd` expose only the immediate controls (`context`,
`abort`, and `emit`); they do not expose buffered mutation methods whose writes
would have no later request to affect. `afterModelTurn` retains the full mutation
API because its changes intentionally apply to the next turn.

`beforeModelCall` receives an immutable request snapshot. Its mutation methods
transform only that call. Every retry starts from canonical turn state, so a
call-local anonymization or trimming transform cannot compound across retries.
Provider-independent sanitation then removes null tool inputs disallowed by
the active JSON schema without mutating canonical messages. Hooks without a
`beforeModelCall` callback do not incur request-snapshot construction.
Persistent mutations belong in run/turn or tool hooks, not model-call terminal
hooks.

`modelCallInterrupted` remains as a deprecated type-level compatibility member
but is no longer invoked. Use `afterModelCall` and inspect `ctx.outcome`.

### Terminal hook failures

`beforeModelTurn` and `beforeModelCall` fail fast. All registered
`afterModelCall`, `afterModelTurn`, and `runEnd` hooks are invoked even when an
earlier terminal hook fails. Terminal hooks are critical by default:

```ts
const telemetryHook = {
  name: 'telemetry',
  terminalFailureMode: 'best_effort',
  // Or use afterModelCallFailureMode / afterModelTurnFailureMode.
  afterModelCall(ctx) {
    // ...
  },
};
```

A critical call or turn hook failure prevents retry, tool execution, and the
next paid call. When a provider call and a critical call hook both fail, the
hook failure is surfaced with the provider failure retained as structured
metadata. `runEndFailureMode` remains supported as a deprecated phase-specific
alias. `runEnd` receives an isolated, frozen terminal error so one hook cannot
rewrite the value seen by later hooks or the subsequent `error` event. Run-end
failures produce `finalization_error` events without replacing the already
determined run outcome; a critical failure rejects iterator close when the
consumer has abandoned the stream.

## Cancellation and idle timeout

Each model call receives its own `AbortSignal`. The runtime combines host
cancellation, hook abort, the per-call idle timer, and consumer abandonment;
it closes the provider iterator, suppresses late chunks, and awaits call,
turn, and run terminal hooks. Retry backoff is abortable. Terminal hooks do not
receive the already-aborted provider signal. If cancellation arrives while
`afterModelCall` is pending for an otherwise accepted call, the hooks finish,
`afterModelTurn` receives `consumer_abandoned` or `aborted` with that call
attached, and the assistant message is not accepted into canonical state.

`modelCallIdleTimeoutMs` defaults to
`DEFAULT_MODEL_CALL_IDLE_TIMEOUT_MS` (180,000 ms) and is validated as a
positive number. An idle timeout before any provider chunk is classified as
stream establishment; after any chunk, including usage-only metadata, it is
stream consumption. A timeout before visible output is retryable subject to the
shared retry policy; after visible output it is terminal. Parent cancellation
is combined into child-run cancellation.

## Errors and usage

Portable provider kind, stage, upstream status, safe request ID, retry timing,
and transport facts are retained in `afterModelCall`. If the call is terminal,
the existing `error` event also includes `modelCall` identity and
`providerFailure`; recovered calls do not add consumer lifecycle events. Raw
provider causes are never serialized into events.

Call outcomes and `run_end.usage` preserve all four provider-reported token
dimensions exactly once:

- `inputTokens`
- `outputTokens`
- `cacheReadInputTokens`
- `cacheWriteInputTokens`

## Tools and child runs

Tool calls execute sequentially. `afterToolCall` receives `isLastToolCall` and
an outcome of `success`, `error`, or `aborted`. Executable tools may return a
string or `{ result, isError }`. Tool output is capped at 200,000 characters.
Malformed tool arguments are never executed. After recovery consumes the last
retry, the final call disables tools and asks for a direct answer.

Tools can call `ctx.runChild(...)`. Child contexts read through to parent
values while keeping writes local. Hooks, retry policy, idle timeout, and
cancellation inherit unless explicitly overridden; hook contexts always carry
the child's actual provider. Individual hooks can set
`inheritToChildRuns: false` when their state or side effects belong only to the
root run. Omitting the property preserves default inheritance, and explicit
child `hooks` still replace the inherited set.

## Development

```bash
pnpm --filter @ayunis/agent-runtime run test
pnpm --filter @ayunis/agent-runtime run typecheck
pnpm --filter @ayunis/agent-runtime run lint
pnpm --filter @ayunis/agent-runtime run build
pnpm --filter @ayunis/agent-runtime run deps:check
```
