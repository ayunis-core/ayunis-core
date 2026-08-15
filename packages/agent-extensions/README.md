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

## MCP extension

MCP support is an optional subpath so core consumers do not load the MCP SDK:

```ts
import {
  createStdioTransport,
  createStreamableHttpTransport,
  mcpExtension,
} from '@ayunis/agent-extensions/mcp';

const mcp = configureRuntimeExtension(mcpExtension, {
  servers: [
    {
      name: 'catalog',
      transport: createStreamableHttpTransport(
        new URL('https://mcp.example.test'),
        { requestInit: { headers: { Authorization: `Bearer ${token}` } } },
      ),
      requestOptions: { timeout: 30_000 },
    },
    {
      name: 'local-tools',
      transport: createStdioTransport({
        command: 'local-mcp-server',
        args: ['--stdio'],
      }),
    },
  ],
});
```

Initialization owns one SDK client per configured server. It connects each
client and calls the SDK's auto-paginating `listTools()` once, exposing the
complete static tool manifest before a run starts. Duplicate server or tool
names fail initialization. Connection or discovery failures close every client
already created and never return a partial manifest.

Runtime tool calls preserve the MCP `content`, `structuredContent`, and
`isError` fields in a JSON result string, while also mapping `isError` to the
runtime's error flag. Per-server request options are forwarded and the current
run's abort signal is added to each tool call.

The extension owns and closes all clients during disposal, attempts every close,
and aggregates close failures. Authentication, credentials, tenancy, connection
pooling, and provider-specific error policy remain host concerns; transport
factories accept caller-owned SDK options without adding such policy.

## Skills extension

Skills use a source port and an optional subpath, independent of storage:

```ts
import {
  skillsExtension,
  type SkillSource,
} from '@ayunis/agent-extensions/skills';

const source: SkillSource = {
  async list() {
    return [{ name: 'access_review', description: 'Review user access' }];
  },
  async load(name) {
    return {
      name,
      description: 'Review user access',
      instructions: 'Follow the access review checklist.',
      tools: [listAccessTool],
    };
  },
};

const skills = configureRuntimeExtension(skillsExtension, { source });
```

The source is listed once during initialization, making available-skill
instructions and the `activate_skill` schema static and introspectable. Calling
the activation tool loads the selected definition. Only a successful tool call
causes its instructions and tools to be injected by `afterToolCall` for the next
model iteration. Per-run pending and activated state lives in `RunContext`, and
tool-name collisions return model-actionable activation errors.

### Filesystem skill source

The optional filesystem source reads immediate child directories using the
Agent Skills `SKILL.md` convention:

```text
skills/
└── access-review/
    └── SKILL.md
```

```md
---
name: access-review
description: Review user access
allowed-tools: list_access notify_owner
---

Follow the access review checklist.
```

```ts
import { FilesystemSkillSource } from '@ayunis/agent-extensions/skills/filesystem';

const source = new FilesystemSkillSource({
  root: './skills',
  toolCatalog: {
    list_access: listAccessTool,
    notify_owner: notifyOwnerTool,
  },
});
```

Discovery metadata is cached, while the selected `SKILL.md` is safely re-read
on activation. Allowed tools resolve only through the host catalog. Canonical
path containment prevents model input or symlinks from escaping the configured
root. There is no watcher or hot reload.

This source implements the directory-based Agent Skills convention only. It is
not an Agent Plugins loader and does not claim conformance with the broader
Agent Plugins package standard (`plugin.json`, `mcp.json`, and packaging rules).

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
