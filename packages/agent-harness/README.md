# @ayunis/agent-harness

Runnable agent composition above `@ayunis/agent-runtime` and
`@ayunis/agent-extensions`.

The package is converging on one public abstraction:

```ts
const agent = createAgent(config);
const variant = agent.variant({
  name: 'researcher-with-sources',
  instructions: 'Prefer primary sources.',
  extensions: [Sources.configure(options)],
});

for await (const event of variant.run(input)) {
  // consume runtime events
}
```

At this checkpoint the root exports only the agent, configuration, run-input,
model-resolver, and error contracts. The runnable `createAgent()` implementation
will follow on the same package surface.

Agent configuration has a stable name, instructions, configured extensions, an
opaque host-owned model selector, a resolver callback, and simple run limits.
Variants append instructions and extensions while inheriting model resolution
and limits. Configuration is copied and frozen without resolving models,
running extension setup, or acquiring resources.

Messages, authorization context, capability persistence, and infrastructure
remain host-owned inputs. The package intentionally has no public profile,
registry, shared harness, model-policy/capability layer, or state-store
protocol.

## Private extension execution

Each future `agent.run()` owns one private extension engine. It sets configured
extensions up in order, registers run-local APIs, projects owned instructions
and tools, batches dirty-state reconciliation before model requests, and tears
resources down in reverse order. State and newly acquired resources participate
in engine transactions so prospective contributions can be collision-checked
before an activation commits.

This machinery is deliberately absent from the root exports and package
subpaths. It is an implementation detail of `createAgent()`, not another public
runner, registry, or session abstraction.
