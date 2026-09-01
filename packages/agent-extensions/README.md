# @ayunis/agent-extensions

Composable, in-process extensions for `@ayunis/agent-runtime`.

A runtime extension resolves a static manifest of tools, instructions, and
hooks during initialization. An extension may also own resources across runs
and release them during disposal. The extension set applies every static part
directly to a `RunInput`; the runtime itself remains unchanged and hooks remain
its only extension mechanism.

```ts
import {
  configureRuntimeExtension,
  initializeExtensionSet,
  type RuntimeExtension,
} from '@ayunis/agent-extensions';
import { run } from '@ayunis/agent-runtime';

interface AuditConfig {
  destination: string;
}

const auditExtension: RuntimeExtension<AuditConfig> = async (config) => ({
  name: 'audit',
  instructions: `Audit destination: ${config.destination}`,
  hooks: [auditHook],
  async dispose() {
    await flushAuditEvents();
  },
});

const extensions = await initializeExtensionSet([
  configureRuntimeExtension(auditExtension, { destination: 'ledger' }),
]);

try {
  for await (const event of run(extensions.apply(input))) {
    handleEvent(event);
  }
} finally {
  await extensions.dispose();
}
```

Factories initialize sequentially in registration order. Initialization fails
on duplicate extension or tool names and rolls back completed instances in
reverse order. Applying a manifest rejects collisions with host-provided tools.
Disposal is idempotent, reverse-ordered, attempts every disposer, and throws an
`AggregateError` containing all disposal failures.

## Layering and terminology

- `@ayunis/agent-runtime` is the bare agent loop and hook contracts.
- `@ayunis/agent-extensions` packages composable capabilities and their
  cross-run resource lifetime around those hooks.
- A future `@ayunis/agent-harness` may provide opinionated agent assemblies and
  defaults while accepting additional runtime extensions.

A runtime extension is not an **Agent Plugin**. Agent Plugins v1 is a portable
filesystem package standard built around `plugin.json`, Agent Skills, and
`mcp.json`. Loading that standard is outside this package; a future adapter may
translate a plugin into runtime extensions.

The package is workspace-private. Publishing requires coordinated versioning
and publication of `@ayunis/inference`, `@ayunis/agent-runtime`, and this
package.

## Development

```bash
pnpm --filter '@ayunis/agent-extensions^...' run build
pnpm --filter @ayunis/agent-extensions run typecheck
pnpm --filter @ayunis/agent-extensions run lint
pnpm --filter @ayunis/agent-extensions run test
pnpm --filter @ayunis/agent-extensions run build
pnpm --filter @ayunis/agent-extensions run deps:check
```
