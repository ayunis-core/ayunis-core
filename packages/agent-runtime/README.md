# @ayunis/agent-runtime

An independent TypeScript agent runtime: a bare agent loop with a hook system.

The core is a single free function — no framework object, no initialization step:

```ts
import { run } from '@ayunis/agent-runtime';

for await (const event of run({
  instructions: 'You are a helpful assistant.',
  model, // a ModelProvider instance, e.g. the shipped Anthropic provider
  tools, // concrete tools: { name, description, parameters, execute }
  messages,
  hooks, // the single extension mechanism
})) {
  // streamed RunEvent union: text/thinking/tool-call snapshots, boundaries, run_end
}
```

Design principles:

- **Bare core.** The runtime owns the loop, the `ModelProvider` port (with
  shipped Anthropic + mock implementations), and the `Tool`/`Hook`/
  `RunContext`/`RunEvent` contracts — nothing else.
- **Hooks are the single extension mechanism.** Seven lifecycle phases
  (`runStart`, `beforeModelCall`, `afterModelCall`, `modelCallInterrupted`,
  `beforeToolCall`, `afterToolCall`, `runEnd`). Tools are pure signals; only
  hooks inject tools/instructions, transform messages, persist state, or emit
  custom events.
- **Host concerns stay host-side.** Model selection + credentials,
  agent/skill definitions, persistence, and multi-tenancy live in the host
  (via hooks and the opaque `RunContext`), not in the runtime.

## Model provider failures and cancellation

`ModelProvider.stream()` receives the run's optional `AbortSignal` on every
model call. Hosts may decorate a resolved provider to add cancellation relay,
timeouts, metrics, or provider-specific error classification without changing
the runtime loop or the provider's streamed chunks.

Generic exceptions from a model provider become `PROVIDER_FAILED`. If a host
provider boundary throws an `AgentRuntimeError`, the runtime preserves its
stable `code`, `message`, and serializable `details` in the emitted error event
instead. A completed model call whose tool-call arguments did not arrive
intact — unparseable JSON, or a token-limit finish while tool calls were being
emitted — ends the run with `MALFORMED_TOOL_CALL`; the turn still passes
through `modelCallInterrupted`, so hosts can persist its intact text and
thinking. Three consecutive tool *phases* in which one tool fails with the
identical error text end the run with `TOOL_REPEATEDLY_FAILING` after the
failing phase's tool-result message is emitted — repetition across phases
proves the model saw the error and did not adapt, whereas repeats inside a
single turn precede any feedback and count once. A changed error text, a
success, or an aborted phase resets that tool's streak. An abort-triggered provider
rejection still ends the run with `run_end { status: 'aborted' }` and does
not emit an error event.
Once a terminal assistant turn and its `afterModelCall` hooks have completed,
an external signal arrives too late to cancel that completed run. Explicit
hook cancellation through `ctx.abort()` remains authoritative at every hook
phase.

Tracked in Linear: AYC-148. See the repo's `ARCHITECTURE.md` for how Ayunis
Core consumes this package as one host among others.

## Hook phases

| Phase                  | Typical use                                                    |
| ---------------------- | -------------------------------------------------------------- |
| `runStart`             | guards (quota), seeding instructions/tools, persisting input   |
| `beforeModelCall`      | message transforms (anonymization), trimming                   |
| `afterModelCall`       | usage collection, persisting the assistant message             |
| `modelCallInterrupted` | persisting partial text/thinking after failure or cancellation |
| `beforeToolCall`       | approval gates, rewriting a tool call                          |
| `afterToolCall`        | injecting tools/instructions, persisting tool results          |
| `runEnd`               | finalization, flushing                                         |

`afterToolCall` receives `isLastToolCall`, allowing persistence hooks to flush
the complete grouped result before the runtime exposes its message event.
Executable tools may return either a string for success or
`{ result, isError }` when the host needs to report an explicit failure status.
The runtime accumulates providers' incremental tool-call fields and exposes
`tool_call_snapshot` events containing the raw arguments received so far plus
a best-effort parsed input. A terminal `invalid` snapshot preserves malformed
arguments for presentation and then fails the run with `MALFORMED_TOOL_CALL` —
executing a tool with guessed input would fail identically on every retry, so
no call from a corrupted turn ever reaches execution.

Buffered mutations (`addTools`/`removeTools`/`setTools`, `addInstructions`,
`transformMessages`) apply at the next request assembly: `runStart`/
`beforeModelCall` mutations affect the imminent model call, `afterModelCall`/
`afterToolCall` mutations the next iteration. `abort` and `emit` are
immediate.

`runEnd` failures do not replace the run's original status. They produce a
`finalization_error` event with hook attribution before the terminal
`run_end`. Finalization is critical by default; set
`runEndFailureMode: 'best_effort'` on a non-critical hook to report its failure
without asking the host to fail the operation. If a consumer abandons the
stream before events can be delivered, a critical finalization failure rejects
the iterator close instead.

## Extending the runtime

Hooks are the only extension point. Concrete hook implementations (logging,
anonymization, persistence), the emergent-skill pattern (an `activate_skill`
signal tool + an `afterToolCall` hook that loads a skill definition), and
agent/skill-definition formats are **host/harness concerns** — they are not
part of this package and will ship in a separate harness package. This package
ships only the loop, the contracts, the hook engine, and the `ModelProvider`
port (mock + Anthropic implementations).

## Development

```bash
pnpm --filter @ayunis/agent-runtime run test        # vitest
pnpm --filter @ayunis/agent-runtime run typecheck   # tsc --noEmit
pnpm --filter @ayunis/agent-runtime run lint
pnpm --filter @ayunis/agent-runtime run build       # tsup → dist (ESM + CJS + d.ts)
```
