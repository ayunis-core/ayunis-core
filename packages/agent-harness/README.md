# @ayunis/agent-harness

Runnable, immutable agents above `@ayunis/agent-runtime` and
`@ayunis/agent-extensions`.

## Configure the foundational extensions

```ts
import { KnowledgeBases } from '@ayunis/agent-extensions/knowledge-bases';
import { Mcp } from '@ayunis/agent-extensions/mcp';
import { Skills } from '@ayunis/agent-extensions/skills';
import { createAgent } from '@ayunis/agent-harness';
import { RunContext } from '@ayunis/agent-runtime';

const legalResearch = Skills.define({
  name: 'legal-research',
  description: 'Research laws and regulations.',
  instructions: 'Prefer primary legal sources and cite every conclusion.',
  async activate(ctx) {
    await ctx.use(KnowledgeBases).add(['municipal-law']);
    await ctx.use(Mcp).addConnections(['legal-records']);
  },
});

const researcher = createAgent({
  name: 'researcher',
  instructions: 'Answer with cited evidence.',
  modelSelector: { deployment: 'host-selected' },
  resolveModel: async (selector, { context, signal }) =>
    resolveHostModel({
      selector,
      organizationId: context.get('organizationId'),
      signal,
    }),
  extensions: [
    KnowledgeBases.configure({
      resolveAuthorized: resolveAuthorizedKnowledgeBases,
      query: queryKnowledgeBase,
      getText: getKnowledgeBaseText,
      recordUsage: recordKnowledgeUsage,
    }),
    Mcp.configure({
      resolveAuthorized: resolveAuthorizedMcpConnections,
    }),
    Skills.configure({
      source: {
        list: async () => [
          {
            name: legalResearch.name,
            description: legalResearch.description,
          },
        ],
        load: async (name) => {
          if (name !== legalResearch.name) throw new Error('Unknown skill.');
          return legalResearch;
        },
      },
    }),
  ],
  maxIterations: 12,
});

const legalResearcher = researcher.variant({
  name: 'legal-researcher',
  instructions: 'Explain the controlling jurisdiction.',
});

const context = RunContext.create({ organizationId: 'org-1' });
for await (const event of legalResearcher.run({
  messages,
  tools: hostTools,
  context,
  signal: abortController.signal,
})) {
  handleEvent(event);
}
```

The model selector is opaque to the package. `resolveModel()` receives the
agent's frozen selector and current run context on every root run, so the host
retains model policy, credentials, and provider construction. Creating an agent
does not resolve a model, initialize an extension, or acquire a resource.

`agent.run()` forwards runtime events unchanged. Messages, authorization data,
host tools, abort signals, durable capability state, and persistence remain
host-owned inputs. When no context is supplied, the agent creates a fresh root
`RunContext`.

## Variants

A variant is another frozen runnable agent. It may append instructions and
extensions while inheriting the base agent's model selector, resolver, limits,
tool choice, and configured extensions. It cannot replace inherited settings or
repeat an inherited extension.

```ts
const conciseResearcher = researcher.variant({
  name: 'concise-researcher',
  instructions: 'Keep the final answer under 300 words.',
});

for await (const event of conciseResearcher.run({ messages, context })) {
  handleEvent(event);
}
```

## Run lifecycle and isolation

Every root run performs the following lifecycle:

1. resolve the model for the run context;
2. create a private extension engine and set up configured extensions in order;
3. collision-check and compose host and extension instructions and tools;
4. delegate execution to `@ayunis/agent-runtime`;
5. close the runtime iterator and dispose extension resources in reverse order.

Cleanup is idempotent and runs after completion, runtime failure, abort, setup
rollback, or an explicit event-iterator `.return()`. Concurrent runs share only
the frozen agent configuration; their extension state, APIs, and run-owned
resources are independent.

Tools may use the runtime's `runChild()` seam. The harness creates a fresh
private extension engine around every child input and derived child context. A
child receives fresh extension state, APIs, hooks, and resources, does not
inherit its parent's activated capabilities, and finalizes independently.

## Public boundary

The root package exports `createAgent()`, its agent/configuration/run types,
model-resolver contracts, and attributed configuration/model-resolution errors.
The extension engine remains private. There is no public profile, shared
harness, registry, session runner, agent-state store, model-policy layer, or
implicit persistence protocol.
