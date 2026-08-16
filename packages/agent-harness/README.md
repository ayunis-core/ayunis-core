# @ayunis/agent-harness

Runnable, immutable agents above `@ayunis/agent-runtime` and
`@ayunis/agent-extensions`.

## Create and run an agent

```ts
import { createAgent } from '@ayunis/agent-harness';
import { RunContext } from '@ayunis/agent-runtime';

const agent = createAgent({
  name: 'researcher',
  instructions: 'Answer with cited evidence.',
  extensions: [KnowledgeBases.configure(knowledgeBaseOptions)],
  modelSelector: { deployment: 'host-selected' },
  resolveModel: async (selector, { context, signal }) =>
    resolveHostModel({
      selector,
      organizationId: context.get('organizationId'),
      signal,
    }),
  maxIterations: 12,
});

const context = RunContext.create({ organizationId: 'org-1' });
for await (const event of agent.run({
  messages,
  tools: hostTools,
  context,
  signal: abortController.signal,
})) {
  handleEvent(event);
}
```

The model selector is opaque to the package. `resolveModel()` receives the
agent's frozen selector and the current run context on every public run, so the
host remains responsible for model policy, credentials, and concrete provider
construction. Creating an agent does not resolve a model, initialize an
extension, or acquire a resource.

`agent.run()` forwards runtime events unchanged. Messages, authorization data,
host tools, abort signals, durable capability state, and persistence remain
host-owned inputs. When no context is supplied, the agent creates a fresh root
`RunContext`.

## Variants

```ts
const legalResearcher = agent.variant({
  name: 'legal-researcher',
  instructions: 'Prefer primary legal sources.',
  extensions: [Skills.configure(skillsOptions)],
});
```

A variant is another frozen runnable agent. It appends instructions and
extensions while inheriting the base agent's model selector, resolver, limits,
tool choice, and configured extensions. It cannot replace inherited settings
or repeat an inherited extension.

## Run lifecycle and isolation

Every root run performs the following lifecycle:

1. resolve the model for the run context;
2. create a private extension engine and set up configured extensions in order;
3. collision-check and compose host and extension instructions and tools;
4. delegate execution to `@ayunis/agent-runtime`;
5. close the runtime iterator and dispose extension resources in reverse order.

Cleanup is idempotent and runs after completion, runtime failure, abort, setup
rollback, or an explicit event-iterator `.return()`. Concurrent runs share only
the frozen agent configuration; their extension state and run-owned resources
are independent.

Tools may use the runtime's `runChild()` seam. The harness intercepts child
execution to create a new private extension engine around the child input and
its derived child context. A child receives fresh extension state, hooks, and
resources, does not inherit the parent's extension instances, and finalizes
independently. Explicit child host hooks still apply to that child.

## Public boundary

The root package exports `createAgent()`, its agent/configuration/run types,
model-resolver contracts, and attributed configuration/model-resolution errors.
The extension engine remains private. There is no public profile, shared
harness, registry, session runner, agent-state store, model-policy layer, or
implicit persistence protocol.
