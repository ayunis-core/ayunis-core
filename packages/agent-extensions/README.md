# @ayunis/agent-extensions

Public contracts and built-in capabilities for run-scoped agent extensions.
The package depends on `@ayunis/agent-runtime`, while execution and lifecycle
coordination belong to the private machinery in `@ayunis/agent-harness`.

## Definitions and configuration

```ts
import { defineExtension } from '@ayunis/agent-extensions';

const Counter = defineExtension({
  name: 'counter',
  setup(ctx, config: { initial: number }) {
    const state = ctx.state(config.initial);
    return {
      state,
      api: { increment: () => state.update((value) => value + 1) },
    };
  },
  contribute({ state }) {
    return { instructions: `Current count: ${state}` };
  },
});

const configured = Counter.configure({ initial: 0 });
```

A definition has stable identity. `.configure()` copies and freezes configuration
without running setup, allocating state, or acquiring resources. Each agent run
later calls `setup()` once, then synchronously projects its current state through
`contribute()`.

During setup, `ctx.use(Extension)` obtains a required run-local API and
`ctx.useOptional(Extension)` performs optional lookup. `ctx.state()` creates
state owned by the current extension, and `ctx.own()` registers cleanup. The
private harness engine makes both state updates and resource ownership
transaction-aware.

This package intentionally exposes no extension session, registry, or runner.
Hosts provide authorization, credentials, persistence, and infrastructure;
`@ayunis/agent-harness` owns execution and cleanup.
