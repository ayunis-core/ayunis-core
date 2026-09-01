import { defineExtension } from '@ayunis/agent-extensions';
import {
  MockProvider,
  RunContext,
  textTurn,
  toolCallTurn,
  type Message,
  type ModelProvider,
  type RunEvent,
  type Tool,
} from '@ayunis/agent-runtime';
import { describe, expect, it, vi } from 'vitest';

import {
  AgentConfigurationError,
  ModelResolutionError,
  createAgent,
} from '../index';

const emptyConfig = {} as Record<string, never>;
const userMessage = (text: string): Message => ({
  role: 'user',
  content: [{ type: 'text', text }],
});
const collect = async (
  events: AsyncIterable<RunEvent>,
): Promise<RunEvent[]> => {
  const collected: RunEvent[] = [];
  for await (const event of events) collected.push(event);
  return collected;
};
const tool = (name: string, execute?: Tool['execute']): Tool => ({
  name,
  description: name,
  parameters: { type: 'object', properties: {} },
  ...(execute ? { execute } : {}),
});

const Resource = (setup: () => void, cleanup: () => void) =>
  defineExtension({
    name: 'resource',
    setup: (ctx, config: Record<string, never>) => {
      setup();
      ctx.own(cleanup);
      return { state: ctx.state(config), api: {} };
    },
    contribute: () => ({}),
  });

describe('createAgent', () => {
  it('validates and snapshots immutable configuration without run work', async () => {
    const setup = vi.fn();
    const cleanup = vi.fn();
    const Lazy = Resource(setup, cleanup);
    const extensions = [Lazy.configure(emptyConfig)];
    const selector = { provider: { deployment: 'alpha' } };
    const resolver = vi.fn(
      (selector: Readonly<{ provider: { deployment: string } }>) =>
        new MockProvider([textTurn(selector.provider.deployment)]),
    );

    const agent = createAgent({
      name: 'researcher',
      instructions: 'Research carefully.',
      extensions,
      modelSelector: selector,
      resolveModel: resolver,
    });
    selector.provider.deployment = 'changed';
    extensions.length = 0;

    expect(Object.isFrozen(agent)).toBe(true);
    expect(agent.name).toBe('researcher');
    expect(setup).not.toHaveBeenCalled();
    expect(resolver).not.toHaveBeenCalled();

    await collect(agent.run({ messages: [userMessage('go')] }));

    expect(resolver.mock.calls[0][0]).toEqual({
      provider: { deployment: 'alpha' },
    });
    expect(Object.isFrozen(resolver.mock.calls[0][0])).toBe(true);
    expect(setup).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('rejects invalid configuration synchronously', () => {
    expect(() =>
      createAgent({
        name: 'invalid name',
        instructions: 'Invalid.',
        modelSelector: 'mock',
        resolveModel: () => new MockProvider([]),
      }),
    ).toThrow(AgentConfigurationError);
  });

  it('creates frozen variants that append only instructions and extensions', async () => {
    const Base = defineExtension({
      name: 'base',
      setup: (ctx, config: Record<string, never>) => ({
        state: ctx.state(config),
        api: {},
      }),
      contribute: () => ({
        instructions: 'Base extension.',
        tools: [tool('base_tool')],
      }),
    });
    const Extra = defineExtension({
      name: 'extra',
      setup: (ctx, config: Record<string, never>) => ({
        state: ctx.state(config),
        api: {},
      }),
      contribute: () => ({ instructions: 'Extra extension.' }),
    });
    const model = new MockProvider([textTurn('done')]);
    const resolver = vi.fn(() => model);
    const base = createAgent({
      name: 'base-agent',
      instructions: 'Base instructions.',
      extensions: [Base.configure(emptyConfig)],
      modelSelector: { deployment: 'alpha' },
      resolveModel: resolver,
      maxIterations: 7,
      toolChoice: 'required',
    });

    const variant = base.variant({
      name: 'variant-agent',
      instructions: 'Variant instructions.',
      extensions: [Extra.configure(emptyConfig)],
    });
    const events = await collect(
      variant.run({ messages: [userMessage('go')] }),
    );

    expect(Object.isFrozen(variant)).toBe(true);
    expect(base.name).toBe('base-agent');
    expect(variant.name).toBe('variant-agent');
    expect(events[0]).toMatchObject({ type: 'run_start', maxIterations: 7 });
    expect(model.requests[0]).toMatchObject({
      instructions:
        'Base instructions.\n\nVariant instructions.\n\nBase extension.\n\nExtra extension.',
      toolChoice: 'required',
    });
    expect(model.requests[0].tools.map(({ name }) => name)).toEqual([
      'base_tool',
    ]);
    expect(resolver).toHaveBeenCalledOnce();
  });
});

describe('agent.run', () => {
  it('resolves the opaque model selector for every run with its context and signal', async () => {
    const models = [
      new MockProvider([textTurn('first')]),
      new MockProvider([textTurn('second')]),
    ];
    const resolver = vi
      .fn<() => ModelProvider>()
      .mockReturnValueOnce(models[0])
      .mockReturnValueOnce(models[1]);
    const selector = Object.freeze({ deployment: 'host-owned' });
    const agent = createAgent({
      name: 'runner',
      instructions: 'Run.',
      modelSelector: selector,
      resolveModel: resolver,
    });
    const firstContext = RunContext.create({ request: 'first' });
    const secondContext = RunContext.create({ request: 'second' });
    const controller = new AbortController();

    const firstEvents = await collect(
      agent.run({
        messages: [userMessage('one')],
        context: firstContext,
        signal: controller.signal,
      }),
    );
    await collect(
      agent.run({ messages: [userMessage('two')], context: secondContext }),
    );

    expect(resolver).toHaveBeenNthCalledWith(1, selector, {
      context: firstContext,
      signal: controller.signal,
    });
    expect(resolver).toHaveBeenNthCalledWith(2, selector, {
      context: secondContext,
    });
    expect(firstEvents.map(({ type }) => type)).toEqual([
      'run_start',
      'text_delta',
      'text_delta',
      'assistant_message',
      'run_end',
    ]);
    expect(firstEvents.every(({ runId }) => runId === firstContext.runId)).toBe(
      true,
    );
  });

  it('attributes model resolution failures without setting up extensions', async () => {
    const setup = vi.fn();
    const Lazy = Resource(setup, vi.fn());
    const failure = new Error('credentials unavailable');
    const agent = createAgent({
      name: 'runner',
      instructions: 'Run.',
      extensions: [Lazy.configure(emptyConfig)],
      modelSelector: 'unavailable',
      resolveModel: () => {
        throw failure;
      },
    });

    await expect(
      collect(agent.run({ messages: [userMessage('go')] })),
    ).rejects.toMatchObject({
      name: 'ModelResolutionError',
      agentName: 'runner',
      cause: failure,
    });
    expect(setup).not.toHaveBeenCalled();
    expect(new ModelResolutionError('runner', failure).message).toMatch(
      /runner/,
    );
  });

  it('rejects initial tool collisions before calling the provider and cleans up', async () => {
    const cleanup = vi.fn();
    const Collision = defineExtension({
      name: 'collision',
      setup: (ctx, config: Record<string, never>) => {
        ctx.own(cleanup);
        return { state: ctx.state(config), api: {} };
      },
      contribute: () => ({ tools: [tool('duplicate')] }),
    });
    const model = new MockProvider([textTurn('unreachable')]);
    const agent = createAgent({
      name: 'runner',
      instructions: 'Run.',
      extensions: [Collision.configure(emptyConfig)],
      modelSelector: 'mock',
      resolveModel: () => model,
    });

    await expect(
      collect(
        agent.run({
          messages: [userMessage('go')],
          tools: [tool('duplicate')],
        }),
      ),
    ).rejects.toThrow(/duplicate/);
    expect(model.requests).toHaveLength(0);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('disposes once after completion, provider failure, and abort', async () => {
    const completionCleanup = vi.fn();
    const failureCleanup = vi.fn();
    const abortCleanup = vi.fn();
    const failingModel: ModelProvider = {
      name: 'failing',
      stream() {
        throw new Error('provider failed');
      },
    };
    const controller = new AbortController();
    controller.abort();
    const cases = [
      {
        resource: Resource(vi.fn(), completionCleanup),
        model: new MockProvider([textTurn('done')]),
        cleanup: completionCleanup,
      },
      {
        resource: Resource(vi.fn(), failureCleanup),
        model: failingModel,
        cleanup: failureCleanup,
      },
      {
        resource: Resource(vi.fn(), abortCleanup),
        model: new MockProvider([textTurn('unreachable')]),
        cleanup: abortCleanup,
        signal: controller.signal,
      },
    ];

    for (const [index, entry] of cases.entries()) {
      const agent = createAgent({
        name: `runner-${index}`,
        instructions: 'Run.',
        extensions: [entry.resource.configure(emptyConfig)],
        modelSelector: 'mock',
        resolveModel: () => entry.model,
      });
      const events = await collect(
        agent.run({
          messages: [userMessage('go')],
          ...(entry.signal ? { signal: entry.signal } : {}),
        }),
      );

      expect(entry.cleanup).toHaveBeenCalledOnce();
      expect(events.at(-1)?.type).toBe('run_end');
    }
  });

  it('rolls failed setup back in reverse order before rejecting', async () => {
    const lifecycle: string[] = [];
    const First = defineExtension({
      name: 'first',
      setup: (ctx, config: Record<string, never>) => {
        lifecycle.push('setup:first');
        ctx.own(() => {
          lifecycle.push('cleanup:first');
        });
        return { state: ctx.state(config), api: {} };
      },
      contribute: () => ({}),
    });
    const Failing = defineExtension({
      name: 'failing',
      setup: (ctx) => {
        lifecycle.push('setup:failing');
        ctx.own(() => {
          lifecycle.push('cleanup:failing');
        });
        throw new Error('setup failed');
      },
      contribute: () => ({}),
    });
    const model = new MockProvider([textTurn('unreachable')]);
    const agent = createAgent({
      name: 'runner',
      instructions: 'Run.',
      extensions: [First.configure(emptyConfig), Failing.configure()],
      modelSelector: 'mock',
      resolveModel: () => model,
    });

    await expect(
      collect(agent.run({ messages: [userMessage('go')] })),
    ).rejects.toThrow('setup failed');
    expect(lifecycle).toEqual([
      'setup:first',
      'setup:failing',
      'cleanup:failing',
      'cleanup:first',
    ]);
    expect(model.requests).toHaveLength(0);
  });

  it('closes and disposes an explicitly returned event iterator exactly once', async () => {
    const cleanup = vi.fn();
    const Lazy = Resource(vi.fn(), cleanup);
    const agent = createAgent({
      name: 'runner',
      instructions: 'Run.',
      extensions: [Lazy.configure(emptyConfig)],
      modelSelector: 'mock',
      resolveModel: () => new MockProvider([textTurn('unreachable')]),
    });
    const iterator = agent
      .run({ messages: [userMessage('go')] })
      [Symbol.asyncIterator]();

    expect(await iterator.next()).toMatchObject({
      done: false,
      value: { type: 'run_start' },
    });
    expect(cleanup).not.toHaveBeenCalled();
    await iterator.return?.();

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('keeps extension state and resources isolated across concurrent runs', async () => {
    const setupIds: number[] = [];
    const cleanupIds: number[] = [];
    const Counter = defineExtension({
      name: 'counter',
      setup: (ctx, config: Record<string, never>) => {
        const id = setupIds.length;
        setupIds.push(id);
        ctx.own(() => {
          cleanupIds.push(id);
        });
        const state = ctx.state(0);
        return {
          state,
          api: {
            increment: tool('increment', () => {
              state.update((value) => value + 1);
              return 'incremented';
            }),
            config,
          },
        };
      },
      contribute: ({ state, api }) => ({
        instructions: `Count:${state}`,
        tools: [api.increment],
      }),
    });
    const models = {
      first: new MockProvider([
        toolCallTurn({ id: 'increment-1', name: 'increment', input: {} }),
        textTurn('done'),
      ]),
      second: new MockProvider([textTurn('done')]),
    };
    const agent = createAgent({
      name: 'runner',
      instructions: 'Run.',
      extensions: [Counter.configure(emptyConfig)],
      modelSelector: 'mock',
      resolveModel: (_selector, { context }) =>
        models[context.get<'first' | 'second'>('run') ?? 'first'],
    });

    await Promise.all([
      collect(
        agent.run({
          messages: [userMessage('go')],
          context: RunContext.create({ run: 'first' }),
        }),
      ),
      collect(
        agent.run({
          messages: [userMessage('go')],
          context: RunContext.create({ run: 'second' }),
        }),
      ),
    ]);

    expect(models.first.requests[1].instructions).toBe('Run.\n\nCount:1');
    expect(models.second.requests[0].instructions).toBe('Run.\n\nCount:0');
    expect(setupIds).toEqual([0, 1]);
    expect(cleanupIds.toSorted((left, right) => left - right)).toEqual([0, 1]);
  });

  it('runs children with fresh extension state, hooks, context, and cleanup', async () => {
    const setupIds: number[] = [];
    const cleanupIds: number[] = [];
    const childEvents: RunEvent[] = [];
    const childModel = new MockProvider([textTurn('child done')]);
    const Isolated = defineExtension({
      name: 'isolated',
      setup: (ctx, config: Record<string, never>) => {
        const id = setupIds.length;
        setupIds.push(id);
        ctx.own(() => {
          cleanupIds.push(id);
        });
        const state = ctx.state(0);
        const startHook = {
          name: `isolated-${id}`,
          runStart: (hookContext: {
            emit(event: { name: string; data: unknown }): void;
          }) => hookContext.emit({ name: 'isolated-start', data: id }),
        };
        const spawn = tool('spawn', async (_input, toolContext) => {
          state.update((value) => value + 1);
          for await (const event of toolContext.runChild({
            instructions: 'Child.',
            model: childModel,
            messages: [userMessage('child')],
          })) {
            childEvents.push(event);
          }
          return 'child completed';
        });
        return { state, api: { config, spawn, startHook } };
      },
      contribute: ({ state, api }) => ({
        instructions: `Count:${state}`,
        tools: [api.spawn],
        hooks: [api.startHook],
      }),
    });
    const parentModel = new MockProvider([
      toolCallTurn({ id: 'spawn-1', name: 'spawn', input: {} }),
      textTurn('parent done'),
    ]);
    const agent = createAgent({
      name: 'runner',
      instructions: 'Parent.',
      extensions: [Isolated.configure(emptyConfig)],
      modelSelector: 'mock',
      resolveModel: () => parentModel,
    });

    const parentEvents = await collect(
      agent.run({ messages: [userMessage('go')] }),
    );

    expect(parentModel.requests[0].instructions).toBe('Parent.\n\nCount:0');
    expect(parentModel.requests[1].instructions).toBe('Parent.\n\nCount:1');
    expect(childModel.requests[0].instructions).toBe('Child.\n\nCount:0');
    expect(setupIds).toEqual([0, 1]);
    expect(cleanupIds).toEqual([1, 0]);
    expect(childEvents[0]).toMatchObject({ type: 'run_start', depth: 1 });
    expect(childEvents.filter(({ type }) => type === 'custom')).toHaveLength(1);
    expect(parentEvents.filter(({ type }) => type === 'custom')).toHaveLength(
      1,
    );
    expect(childEvents[0].path[0]).toBe(parentEvents[0].runId);
  });
});
