# @ayunis/agent-extensions

Run-scoped extension definitions and built-in capabilities for Ayunis agents.
The package depends on `@ayunis/agent-runtime`; the private engine inside
`@ayunis/agent-harness` executes configured extensions for each `agent.run()`.

## Define an extension

```ts
import { defineExtension } from '@ayunis/agent-extensions';

const Counter = defineExtension({
  name: 'counter',
  setup(ctx, config: { initial: number }) {
    const state = ctx.state(config.initial);
    ctx.own(() => releaseCounterResources());
    return {
      state,
      api: { increment: () => state.update((value) => value + 1) },
    };
  },
  contribute({ state }) {
    return { instructions: `Current count: ${state}` };
  },
});

const configuredCounter = Counter.configure({ initial: 0 });
```

Each run receives a fresh extension instance. `setup()` keeps mutable state, its
typed API, owned resources, and cleanup together. Synchronous `contribute()`
derives instructions, tools, and structurally stable hooks from the current
state. State updates are batched and reconciled before the next model request.

During setup or trusted skill activation, `ctx.use(Extension)` obtains a
required run-local API and `ctx.useOptional(Extension)` performs optional
lookup. `ctx.own()` registers run-owned cleanup. The harness makes state changes
and resources acquired by extension tools transactional.

## Built-in capabilities

Built-ins use optional subpath imports so root consumers do not load MCP, YAML,
or filesystem code they do not configure.

```ts
import { KnowledgeBases } from '@ayunis/agent-extensions/knowledge-bases';
import { Mcp } from '@ayunis/agent-extensions/mcp';
import { Skills } from '@ayunis/agent-extensions/skills';
import { FilesystemSkillSource } from '@ayunis/agent-extensions/skills/filesystem';
```

- `KnowledgeBases` resolves authorized IDs and derives its instructions and
  aggregate query/text tools from one sorted active snapshot.
- `Mcp` resolves authorized connection IDs, owns one client per run connection,
  discovers tools transactionally, and maps deterministic server-namespaced
  model names back to original MCP identities.
- `Skills` lists one catalog, contributes one `activate_skill` tool, and manages
  plain definitions created with `Skills.define()`.
- `FilesystemSkillSource` is optional. It discovers immediate `SKILL.md`
  children, keeps a canonical path map, validates containment, and lazily loads
  only the selected definition.

## Execute extensions through an agent

```ts
import { KnowledgeBases } from '@ayunis/agent-extensions/knowledge-bases';
import { Mcp } from '@ayunis/agent-extensions/mcp';
import { Skills } from '@ayunis/agent-extensions/skills';
import { createAgent } from '@ayunis/agent-harness';

const legalResearch = Skills.define({
  name: 'legal-research',
  description: 'Research laws and regulations.',
  instructions: 'Prefer primary legal sources.',
  async activate(ctx) {
    await ctx.use(KnowledgeBases).add(['municipal-law']);
    await ctx.use(Mcp).addConnections(['legal-records']);
  },
});

const researcher = createAgent({
  name: 'research-agent',
  instructions: 'Answer with cited evidence.',
  modelSelector: { deployment: 'host-selected' },
  resolveModel: hostModelResolver,
  extensions: [
    KnowledgeBases.configure({
      resolveAuthorized: resolveAuthorizedKnowledgeBases,
      query: queryKnowledgeBase,
      getText: getKnowledgeBaseText,
    }),
    Mcp.configure({
      resolveAuthorized: resolveAuthorizedMcpConnections,
    }),
    Skills.configure({ source: hostSkillSource(legalResearch) }),
  ],
});

const legalResearcher = researcher.variant({
  name: 'legal-research-agent',
  instructions: 'State which authority controls the answer.',
});

for await (const event of legalResearcher.run({ messages, context })) {
  handleEvent(event);
}
```

Hosts remain responsible for authorization, credentials, persistence,
transports, model resolution, and infrastructure. These packages contain no
Ayunis Core database or tenancy dependency. Extension setup, reconciliation,
transactions, and cleanup are execution details of `createAgent()` rather than
separate public profile, registry, harness, session-runner, or state-store APIs.
