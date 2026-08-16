# @ayunis/agent-extensions

Run-scoped extension definitions and built-in capabilities for Ayunis agents.
The package depends on `@ayunis/agent-runtime`; the private engine in
`@ayunis/agent-harness` owns setup, reconciliation, transactions, and cleanup.

## Define an extension

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

Each `agent.run()` sets up a fresh instance. `setup()` keeps mutable state, its
API, owned resources, and cleanup together. Synchronous `contribute()` derives
instructions, tools, and structurally stable hooks from the current state.
State updates are batched and reconciled before the next model request.

During setup, `ctx.use(Extension)` obtains a required run-local API and
`ctx.useOptional(Extension)` performs optional lookup. `ctx.own()` registers
run-owned cleanup. The harness makes state changes and resources acquired during
skill activation transactional.

## Built-in capabilities

Built-ins use optional subpath imports so root consumers do not load MCP, YAML,
or filesystem code.

```ts
import { KnowledgeBases } from '@ayunis/agent-extensions/knowledge-bases';
import { Mcp } from '@ayunis/agent-extensions/mcp';
import { Skills } from '@ayunis/agent-extensions/skills';
import { FilesystemSkillSource } from '@ayunis/agent-extensions/skills/filesystem';
```

- `KnowledgeBases` resolves authorized IDs and derives its instructions and
  aggregate query/text tools from one sorted active snapshot.
- `Mcp` resolves authorized connection IDs, owns one client per run connection,
  discovers tools transactionally, and maps deterministic model names back to
  original server/tool identities.
- `Skills` lists one catalog, contributes one `activate_skill` tool, and manages
  plain definitions created with `Skills.define()`.
- `FilesystemSkillSource` is optional. It discovers immediate `SKILL.md`
  children, keeps a canonical path map, validates containment, and lazily
  reloads only the selected definition.

## Configure an agent

```ts
import { createAgent } from '@ayunis/agent-harness';
import { KnowledgeBases } from '@ayunis/agent-extensions/knowledge-bases';
import { Skills } from '@ayunis/agent-extensions/skills';

const legalResearch = Skills.define({
  name: 'legal-research',
  description: 'Research laws and regulations.',
  instructions: 'Prefer primary legal sources.',
  async activate(ctx) {
    await ctx.use(KnowledgeBases).add(['municipal-law']);
  },
});

const agent = createAgent({
  name: 'research-agent',
  instructions: 'Answer with cited evidence.',
  model: { deployment: 'host-selected' },
  resolveModel: hostModelResolver,
  extensions: [
    KnowledgeBases.configure({
      resolveAuthorized: resolveKnowledgeBases,
      query: queryKnowledgeBase,
      getText: getKnowledgeBaseText,
    }),
    Skills.configure({ source: hostSkillSource(legalResearch) }),
  ],
});
```

Hosts remain responsible for authorization, credentials, persistence,
transports, model resolution, and infrastructure. These packages contain no
Ayunis Core database or tenancy dependency and expose no public extension
registry, session runner, or state store.
