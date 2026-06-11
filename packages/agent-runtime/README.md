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
  // streamed RunEvent union: deltas, tool calls, message boundaries, run_end
}
```

Design principles:

- **Bare core.** The runtime owns the loop, the `ModelProvider` port (with
  shipped Anthropic + mock implementations), and the `Tool`/`Hook`/
  `RunContext`/`RunEvent` contracts — nothing else.
- **Hooks are the single extension mechanism.** Six lifecycle phases
  (`runStart`, `beforeModelCall`, `afterModelCall`, `beforeToolCall`,
  `afterToolCall`, `runEnd`). Tools are pure signals; only hooks inject
  tools/instructions, transform messages, persist state, or emit custom
  events.
- **Host concerns stay host-side.** Model selection + credentials,
  agent/skill definitions, persistence, and multi-tenancy live in the host
  (via hooks and the opaque `RunContext`), not in the runtime.

Tracked in Linear: AYC-148. See the repo's `ARCHITECTURE.md` for how Ayunis
Core consumes this package as one host among others.

## Development

```bash
pnpm --filter @ayunis/agent-runtime run test        # vitest
pnpm --filter @ayunis/agent-runtime run typecheck   # tsc --noEmit
pnpm --filter @ayunis/agent-runtime run lint
pnpm --filter @ayunis/agent-runtime run build       # tsup → dist (ESM + CJS + d.ts)
```
