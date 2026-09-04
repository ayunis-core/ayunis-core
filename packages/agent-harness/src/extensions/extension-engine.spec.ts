import { defineExtension } from '@ayunis/agent-extensions';
import {
  MockProvider,
  RunContext,
  run,
  textTurn,
  toolCallTurn,
  type Hook,
  type RunEvent,
  type Tool,
} from '@ayunis/agent-runtime';
import { describe, expect, it, vi } from 'vitest';

import { ExtensionEngine } from './extension-engine';

const emptyConfig = {} as Record<string, never>;
const userMessage = (text: string) => ({
  role: 'user' as const,
  content: [{ type: 'text' as const, text }],
});
const tool = (name: string): Tool => ({
  name,
  description: name,
  parameters: { type: 'object', properties: {} },
  execute: () => name,
});
const toolName = ({ name }: Tool): string => name;

const collect = async (
  iterable: AsyncIterable<RunEvent>,
): Promise<RunEvent[]> => {
  const events: RunEvent[] = [];
  for await (const event of iterable) {
    events.push(event);
  }
  return events;
};

describe('extension setup and API lookup', () => {
  it('rejects duplicate names before setup side effects', async () => {
    const setup = vi.fn();
    const First = defineExtension({
      name: 'duplicate',
      setup: (ctx, config: Record<string, never>) => {
        setup(config);
        return { state: ctx.state(null), api: {} };
      },
      contribute: () => ({}),
    });
    const Second = defineExtension({
      name: 'duplicate',
      setup: (ctx, config: Record<string, never>) => {
        setup(config);
        return { state: ctx.state(null), api: {} };
      },
      contribute: () => ({}),
    });

    await expect(
      ExtensionEngine.create(
        [First.configure(emptyConfig), Second.configure(emptyConfig)],
        RunContext.create(),
      ),
    ).rejects.toThrow(/duplicate/i);
    expect(setup).not.toHaveBeenCalled();
  });

  it('sets up in order and rolls partial setup back in reverse', async () => {
    const events: string[] = [];
    const First = defineExtension({
      name: 'first',
      setup: (ctx, config: Record<string, never>) => {
        events.push(`setup:first:${String(config === emptyConfig)}`);
        ctx.own(() => {
          events.push('cleanup:first');
        });
        return { state: ctx.state(null), api: {} };
      },
      contribute: () => ({}),
    });
    const Failing = defineExtension({
      name: 'failing',
      setup: (ctx, config: Record<string, never>) => {
        events.push(`setup:failing:${String(config === emptyConfig)}`);
        ctx.own(() => {
          events.push('cleanup:failing');
        });
        throw new Error('setup failed');
      },
      contribute: () => ({}),
    });

    await expect(
      ExtensionEngine.create(
        [First.configure(emptyConfig), Failing.configure(emptyConfig)],
        RunContext.create(),
      ),
    ).rejects.toThrow('setup failed');
    expect(events).toEqual([
      'setup:first:false',
      'setup:failing:false',
      'cleanup:failing',
      'cleanup:first',
    ]);
  });

  it('keeps required and optional API lookup local to one engine', async () => {
    const Base = defineExtension({
      name: 'base',
      setup: (ctx, config: { value: string }) => ({
        state: ctx.state(config.value),
        api: { value: config.value },
      }),
      contribute: () => ({}),
    });
    const Consumer = defineExtension({
      name: 'consumer',
      setup: (ctx, config: Record<string, never>) => ({
        state: ctx.state(null),
        api: {
          required: ctx.use(Base).value,
          optional: ctx.useOptional(Base)?.value,
          config,
        },
      }),
      contribute: () => ({}),
    });
    const context = RunContext.create();
    const engine = await ExtensionEngine.create(
      [Base.configure({ value: 'local' }), Consumer.configure(emptyConfig)],
      context,
    );

    expect(engine.getApi(Consumer)).toMatchObject({
      required: 'local',
      optional: 'local',
    });
    await engine.dispose();

    await expect(
      ExtensionEngine.create(
        [Consumer.configure(emptyConfig)],
        RunContext.create(),
      ),
    ).rejects.toMatchObject({
      code: 'MISSING_EXTENSION',
      consumerName: 'consumer',
      missingExtensionName: 'base',
    });
  });
});

describe('contribution reconciliation', () => {
  it('batches updates and reprojects only dirty extensions', async () => {
    const projections = { first: 0, second: 0 };
    const controls: Array<{ increment(): void }> = [];
    const First = defineExtension({
      name: 'first',
      setup: (ctx, config: Record<string, never>) => {
        const state = ctx.state(0);
        const api = { increment: () => state.update((value) => value + 1) };
        controls.push(api);
        return { state, api: { ...api, config } };
      },
      contribute: ({ state }) => {
        projections.first += 1;
        return { instructions: `First:${state}` };
      },
    });
    const Second = defineExtension({
      name: 'second',
      setup: (ctx, config: Record<string, never>) => ({
        state: ctx.state(config),
        api: {},
      }),
      contribute: () => {
        projections.second += 1;
        return { instructions: 'Second' };
      },
    });
    const context = RunContext.create();
    const engine = await ExtensionEngine.create(
      [First.configure(emptyConfig), Second.configure(emptyConfig)],
      context,
    );
    const composition = engine.compose({ instructions: 'Host', tools: [] });
    controls[0].increment();
    controls[0].increment();
    const model = new MockProvider([textTurn('done')]);

    await collect(
      run({
        ...composition,
        model,
        messages: [userMessage('go')],
        context,
      }),
    );

    expect(projections).toEqual({ first: 2, second: 1 });
    expect(model.requests[0].instructions).toBe('Host\n\nFirst:2\n\nSecond');
  });

  it('preserves prospective host mutations and unchanged extension tools', async () => {
    let increment = (): void => undefined;
    const First = defineExtension({
      name: 'first',
      setup: (ctx, config: Record<string, never>) => {
        const state = ctx.state(0);
        increment = () => state.update((value) => value + 1);
        return { state, api: config };
      },
      contribute: ({ state }) => ({
        instructions: `First:${state}`,
        tools: [tool(`first_${state}`)],
      }),
    });
    const stableTool = tool('stable');
    const Second = defineExtension({
      name: 'second',
      setup: (ctx, config: Record<string, never>) => ({
        state: ctx.state(config),
        api: {},
      }),
      contribute: () => ({ tools: [stableTool] }),
    });
    const context = RunContext.create();
    const engine = await ExtensionEngine.create(
      [First.configure(emptyConfig), Second.configure(emptyConfig)],
      context,
    );
    const composition = engine.compose({
      instructions: 'Host',
      tools: [tool('host')],
    });
    const hostPhaseTool = tool('host_phase');
    const hostHook: Hook = {
      name: 'host-mutations',
      beforeModelCall: (ctx) => {
        ctx.addInstructions('Host phase');
        ctx.addTools(hostPhaseTool);
      },
    };
    increment();
    const model = new MockProvider([textTurn('done')]);

    await collect(
      run({
        ...composition,
        hooks: [hostHook, ...composition.hooks],
        model,
        messages: [userMessage('go')],
        context,
      }),
    );

    expect(model.requests[0].instructions).toBe(
      'Host\n\nHost phase\n\nFirst:1',
    );
    expect(model.requests[0].tools.map(({ name }) => name)).toEqual([
      'host',
      'host_phase',
      'first_1',
      'stable',
    ]);
  });

  it('preserves transformed host tools without duplicating extension tools', async () => {
    let increment = (): void => undefined;
    const Dynamic = defineExtension({
      name: 'dynamic-tools',
      setup: (ctx, config: Record<string, never>) => {
        const state = ctx.state(0);
        increment = () => state.update((value) => value + 1);
        return { state, api: config };
      },
      contribute: ({ state }) => ({
        instructions: `State:${state}`,
        tools: [tool('extension')],
      }),
    });
    const context = RunContext.create();
    const engine = await ExtensionEngine.create(
      [Dynamic.configure(emptyConfig)],
      context,
    );
    const composition = engine.compose({
      instructions: '',
      tools: [tool('host')],
    });
    const transformedInputs: string[][] = [];
    const hostHook: Hook = {
      name: 'host-tool-transform',
      beforeModelCall: (ctx) => {
        ctx.transformTools((tools) => {
          transformedInputs.push(tools.map(toolName));
          return tools.map((candidate) => ({
            ...candidate,
            description: `transformed:${candidate.description}`,
          }));
        });
      },
    };
    increment();
    const model = new MockProvider([textTurn('done')]);

    await collect(
      run({
        ...composition,
        hooks: [hostHook, ...composition.hooks],
        model,
        messages: [userMessage('go')],
        context,
      }),
    );

    expect(transformedInputs).toEqual([['host', 'extension']]);
    expect(model.requests[0].tools.map(toolName)).toEqual([
      'host',
      'extension',
    ]);
    expect(model.requests[0].tools[0].description).toBe('transformed:host');
  });

  it('allows the host to reclaim a tool name released by an extension', async () => {
    let deactivate = (): void => undefined;
    const Dynamic = defineExtension({
      name: 'releasing-tools',
      setup: (ctx, config: Record<string, never>) => {
        const state = ctx.state(true);
        deactivate = () => state.update(() => false);
        return { state, api: config };
      },
      contribute: ({ state }) => ({
        tools: state ? [tool('shared')] : [],
      }),
    });
    const context = RunContext.create();
    const engine = await ExtensionEngine.create(
      [Dynamic.configure(emptyConfig)],
      context,
    );
    const composition = engine.compose({ instructions: '', tools: [] });
    const hostHook: Hook = {
      name: 'reclaim-tool',
      beforeModelCall: (ctx) => {
        ctx.transformTools((tools) =>
          tools.map((candidate) => ({
            ...candidate,
            description: 'host-reclaimed',
          })),
        );
      },
    };
    deactivate();
    const model = new MockProvider([textTurn('done')]);

    await collect(
      run({
        ...composition,
        hooks: [hostHook, ...composition.hooks],
        model,
        messages: [userMessage('go')],
        context,
      }),
    );

    expect(model.requests[0].tools).toHaveLength(1);
    expect(model.requests[0].tools[0]).toMatchObject({
      name: 'shared',
      description: 'host-reclaimed',
    });
  });

  it('preserves transformed host instructions without duplicating extensions', async () => {
    let increment = (): void => undefined;
    const Dynamic = defineExtension({
      name: 'dynamic-instructions',
      setup: (ctx, config: Record<string, never>) => {
        const state = ctx.state(0);
        increment = () => state.update((value) => value + 1);
        return { state, api: config };
      },
      contribute: ({ state }) => ({ instructions: `Extension:${state}` }),
    });
    const context = RunContext.create();
    const engine = await ExtensionEngine.create(
      [Dynamic.configure(emptyConfig)],
      context,
    );
    const composition = engine.compose({ instructions: 'Host', tools: [] });
    const transformedInputs: string[] = [];
    const hostHook: Hook = {
      name: 'host-instruction-transform',
      beforeModelCall: (ctx) => {
        ctx.transformInstructions((instructions) => {
          transformedInputs.push(instructions);
          return instructions.replace('Host', 'Transformed host');
        });
      },
    };
    increment();
    const model = new MockProvider([textTurn('done')]);

    await collect(
      run({
        ...composition,
        hooks: [hostHook, ...composition.hooks],
        model,
        messages: [userMessage('go')],
        context,
      }),
    );

    expect(transformedInputs).toEqual(['Host\n\nExtension:0']);
    expect(model.requests[0].instructions).toBe(
      'Transformed host\n\nExtension:1',
    );
  });

  it('fails initial and dynamic collisions before a provider request', async () => {
    let activate = (): void => undefined;
    const Dynamic = defineExtension({
      name: 'dynamic',
      setup: (ctx, config: Record<string, never>) => {
        const state = ctx.state(false);
        activate = () => state.update(() => true);
        return { state, api: config };
      },
      contribute: ({ state }) => ({ tools: state ? [tool('clash')] : [] }),
    });
    const context = RunContext.create();
    const engine = await ExtensionEngine.create(
      [Dynamic.configure(emptyConfig)],
      context,
    );
    expect(() =>
      engine.compose({
        instructions: '',
        tools: [tool('clash'), tool('clash')],
      }),
    ).toThrow(/clash/);

    const cleanEngine = await ExtensionEngine.create(
      [Dynamic.configure(emptyConfig)],
      context,
    );
    const composition = cleanEngine.compose({ instructions: '', tools: [] });
    activate();
    const hostHook: Hook = {
      name: 'collision',
      beforeModelCall: (ctx) => ctx.addTools(tool('clash')),
    };
    const model = new MockProvider([textTurn('unreachable')]);
    const events = await collect(
      run({
        ...composition,
        hooks: [hostHook, ...composition.hooks],
        model,
        messages: [userMessage('go')],
        context,
      }),
    );

    expect(model.requests).toHaveLength(0);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'error',
          message: expect.stringMatching(/clash/),
        }),
      ]),
    );
  });

  it('keeps contributed hooks stable while they read current state', async () => {
    let increment = (): void => undefined;
    const StatefulHook = defineExtension({
      name: 'stateful-hook',
      setup: (ctx, config: Record<string, never>) => {
        const state = ctx.state(0);
        const hook: Hook = {
          name: 'current-state',
          beforeModelCall: (hookContext) => {
            hookContext.addInstructions(`Hook:${state.current}`);
          },
        };
        increment = () => state.update((value) => value + 1);
        return { state, api: { hook, config } };
      },
      contribute: ({ api }) => ({ hooks: [api.hook] }),
    });
    const context = RunContext.create();
    const engine = await ExtensionEngine.create(
      [StatefulHook.configure(emptyConfig)],
      context,
    );
    const composition = engine.compose({ instructions: 'Host', tools: [] });
    increment();
    const model = new MockProvider([textTurn('done')]);

    await collect(
      run({
        ...composition,
        model,
        messages: [userMessage('go')],
        context,
      }),
    );

    expect(model.requests[0].instructions).toBe('Host\n\nHook:1');
  });

  it('rejects updates during projection and after disposal', async () => {
    let bump = (): void => undefined;
    const Invalid = defineExtension({
      name: 'invalid',
      setup: (ctx, config: Record<string, never>) => {
        const state = ctx.state(0);
        bump = () => state.update((value) => value + 1);
        return { state, api: { bump, config } };
      },
      contribute: ({ state, api }) => {
        if (state > 0) api.bump();
        return {};
      },
    });
    const context = RunContext.create();
    const engine = await ExtensionEngine.create(
      [Invalid.configure(emptyConfig)],
      context,
    );
    const composition = engine.compose({ instructions: '', tools: [] });
    bump();
    const model = new MockProvider([textTurn('unreachable')]);

    const events = await collect(
      run({
        ...composition,
        model,
        messages: [userMessage('go')],
        context,
      }),
    );
    expect(model.requests).toHaveLength(0);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringMatching(/projection/),
        }),
      ]),
    );

    await engine.dispose();
    expect(bump).toThrow(/dispos/);
  });
});

describe('transactions and lifecycle', () => {
  it('rolls back extension API mutations when a contributed tool fails', async () => {
    const cleanup = vi.fn();
    const cleanupCounts: number[] = [];
    const Capability = defineExtension({
      name: 'dynamic-capability',
      setup: (ctx, config: Record<string, never>) => {
        const state = ctx.state(false);
        return {
          state,
          api: {
            enable: () => {
              state.update(() => true);
              ctx.own(cleanup);
            },
            config,
          },
        };
      },
      contribute: ({ state }) => ({
        tools: state ? [tool('dynamic_tool')] : [],
      }),
    });
    const Activator = defineExtension({
      name: 'activator',
      setup: (ctx, config: Record<string, never>) => {
        const capability = ctx.use(Capability);
        const activate: Tool = {
          ...tool('activate'),
          execute: () => {
            capability.enable();
            throw new Error('activation failed');
          },
        };
        return { state: ctx.state(config), api: { activate } };
      },
      contribute: ({ api }) => ({ tools: [api.activate] }),
    });
    const context = RunContext.create();
    const engine = await ExtensionEngine.create(
      [Capability.configure(emptyConfig), Activator.configure(emptyConfig)],
      context,
    );
    const composition = engine.compose({ instructions: '', tools: [] });
    const observeRollback: Hook = {
      name: 'observe-rollback',
      afterToolCall: () => {
        cleanupCounts.push(cleanup.mock.calls.length);
      },
    };
    const model = new MockProvider([
      toolCallTurn({ id: 'activate-1', name: 'activate', input: {} }),
      textTurn('done'),
    ]);

    await collect(
      run({
        ...composition,
        hooks: [observeRollback, ...composition.hooks],
        model,
        messages: [userMessage('go')],
        context,
      }),
    );

    expect(cleanupCounts).toEqual([1]);
    expect(
      model.requests.map((request) => request.tools.map(toolName)),
    ).toEqual([['activate'], ['activate']]);
  });

  it('commits extension API mutations when a contributed tool succeeds', async () => {
    const Dynamic = defineExtension({
      name: 'successful-activation',
      setup: (ctx, config: Record<string, never>) => {
        const state = ctx.state(false);
        const activate: Tool = {
          ...tool('activate'),
          execute: () => {
            state.update(() => true);
            return 'activated';
          },
        };
        return { state, api: { activate, config } };
      },
      contribute: ({ state, api }) => ({
        tools: [api.activate, ...(state ? [tool('dynamic_tool')] : [])],
      }),
    });
    const context = RunContext.create();
    const engine = await ExtensionEngine.create(
      [Dynamic.configure(emptyConfig)],
      context,
    );
    const composition = engine.compose({ instructions: '', tools: [] });
    const model = new MockProvider([
      toolCallTurn({ id: 'activate-1', name: 'activate', input: {} }),
      textTurn('done'),
    ]);

    await collect(
      run({
        ...composition,
        model,
        messages: [userMessage('go')],
        context,
      }),
    );

    expect(
      model.requests.map((request) => request.tools.map(toolName)),
    ).toEqual([['activate'], ['activate', 'dynamic_tool']]);
  });

  it('exposes staged reads, commits atomically, and supports nesting', async () => {
    let setValue = (value: number): void => {
      throw new Error(`State control was not initialized for ${value}.`);
    };
    let readValue = (): number => -1;
    const Stateful = defineExtension({
      name: 'stateful',
      setup: (ctx, config: Record<string, never>) => {
        const state = ctx.state(0);
        setValue = (value) => state.update(() => value);
        readValue = () => state.current;
        return { state, api: config };
      },
      contribute: ({ state }) => ({ instructions: `Value:${state}` }),
    });
    const engine = await ExtensionEngine.create(
      [Stateful.configure(emptyConfig)],
      RunContext.create(),
    );
    engine.compose({ instructions: '', tools: [] });

    await engine.runTransaction(async () => {
      setValue(1);
      expect(readValue()).toBe(1);
      await engine.runTransaction(() => {
        setValue(2);
        expect(readValue()).toBe(2);
      });
    });

    expect(readValue()).toBe(2);
  });

  it('validates contributed tools against host tools from an earlier phase', async () => {
    let readActive = (): boolean => true;
    const Transactional = defineExtension({
      name: 'host-aware-transaction',
      setup: (ctx, config: Record<string, never>) => {
        const state = ctx.state(false);
        const activate: Tool = {
          ...tool('activate'),
          execute: () => {
            state.update(() => true);
            return 'activated';
          },
        };
        readActive = () => state.current;
        return { state, api: { activate, config } };
      },
      contribute: ({ state, api }) => ({
        tools: [api.activate, ...(state ? [tool('host_added')] : [])],
      }),
    });
    const context = RunContext.create();
    const engine = await ExtensionEngine.create(
      [Transactional.configure(emptyConfig)],
      context,
    );
    const composition = engine.compose({ instructions: '', tools: [] });
    const hostHook: Hook = {
      name: 'host-tool',
      afterModelCall: (ctx) => ctx.addTools(tool('host_added')),
    };
    const model = new MockProvider([
      toolCallTurn({ id: 'activate-1', name: 'activate', input: {} }),
      textTurn('done'),
    ]);

    const events = await collect(
      run({
        ...composition,
        hooks: [hostHook, ...composition.hooks],
        model,
        messages: [userMessage('go')],
        context,
      }),
    );

    expect(readActive()).toBe(false);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'tool_result',
          toolName: 'activate',
          isError: true,
          result: expect.stringMatching(/host_added/),
        }),
      ]),
    );
  });

  it('sees host tools queued by an earlier afterToolCall hook', async () => {
    let activate = (): void => undefined;
    let readActive = (): boolean => true;
    let runActivation = (): Promise<void> => Promise.resolve();
    const activationHook: Hook = {
      name: 'activate-after-tool',
      afterToolCall: async () => runActivation(),
    };
    const Transactional = defineExtension({
      name: 'after-tool-transaction',
      setup: (ctx, config: Record<string, never>) => {
        const state = ctx.state(false);
        activate = () => state.update(() => true);
        readActive = () => state.current;
        return { state, api: config };
      },
      contribute: ({ state }) => ({
        hooks: [activationHook],
        tools: state ? [tool('host_added')] : [],
      }),
    });
    const context = RunContext.create();
    const engine = await ExtensionEngine.create(
      [Transactional.configure(emptyConfig)],
      context,
    );
    runActivation = () => engine.runTransaction(() => activate());
    const composition = engine.compose({
      instructions: '',
      tools: [tool('trigger')],
    });
    const hostHook: Hook = {
      name: 'host-tool-after-tool',
      afterToolCall: (ctx) => ctx.addTools(tool('host_added')),
    };
    const model = new MockProvider([
      toolCallTurn({ id: 'trigger-1', name: 'trigger', input: {} }),
      textTurn('unreachable'),
    ]);

    await collect(
      run({
        ...composition,
        hooks: [hostHook, ...composition.hooks],
        model,
        messages: [userMessage('go')],
        context,
      }),
    );

    expect(readActive()).toBe(false);
    expect(model.requests).toHaveLength(1);
  });

  it('restores state and cleans provisional resources on failed validation', async () => {
    const cleanup = vi.fn();
    let activate = (): void => undefined;
    let readActive = (): boolean => true;
    const Transactional = defineExtension({
      name: 'transactional',
      setup: (ctx, config: Record<string, never>) => {
        const state = ctx.state(false);
        activate = () => {
          state.update(() => true);
          ctx.own(cleanup);
        };
        readActive = () => state.current;
        return { state, api: config };
      },
      contribute: ({ state }) => ({ tools: state ? [tool('host')] : [] }),
    });
    const engine = await ExtensionEngine.create(
      [Transactional.configure(emptyConfig)],
      RunContext.create(),
    );
    engine.compose({ instructions: '', tools: [tool('host')] });

    await expect(engine.runTransaction(() => activate())).rejects.toThrow(
      /host/,
    );

    expect(readActive()).toBe(false);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('disposes resources when the event iterator is abandoned', async () => {
    const cleanup = vi.fn();
    const Resource = defineExtension({
      name: 'resource',
      setup: (ctx, config: Record<string, never>) => {
        ctx.own(cleanup);
        return { state: ctx.state(config), api: {} };
      },
      contribute: () => ({}),
    });
    const context = RunContext.create();
    const engine = await ExtensionEngine.create(
      [Resource.configure(emptyConfig)],
      context,
    );
    const composition = engine.compose({ instructions: '', tools: [] });
    const iterator = run({
      ...composition,
      model: new MockProvider([textTurn('unreachable')]),
      messages: [userMessage('go')],
      context,
    })[Symbol.asyncIterator]();

    await iterator.next();
    await iterator.return?.();

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('keeps concurrent engines isolated', async () => {
    const controls: Array<{ increment(): void; read(): number }> = [];
    const Counter = defineExtension({
      name: 'counter',
      setup: (ctx, config: Record<string, never>) => {
        const state = ctx.state(0);
        const api = {
          increment: () => state.update((value) => value + 1),
          read: () => state.current,
        };
        controls.push(api);
        return { state, api: { ...api, config } };
      },
      contribute: () => ({}),
    });

    const [first, second] = await Promise.all([
      ExtensionEngine.create(
        [Counter.configure(emptyConfig)],
        RunContext.create(),
      ),
      ExtensionEngine.create(
        [Counter.configure(emptyConfig)],
        RunContext.create(),
      ),
    ]);
    controls[0].increment();

    expect(controls.map((control) => control.read())).toEqual([1, 0]);
    await Promise.all([first.dispose(), second.dispose()]);
  });

  it('rejects engine hooks inherited by a different runtime context', async () => {
    const Empty = defineExtension({
      name: 'empty',
      setup: (ctx, config: Record<string, never>) => ({
        state: ctx.state(config),
        api: {},
      }),
      contribute: () => ({}),
    });
    const context = RunContext.create();
    const engine = await ExtensionEngine.create(
      [Empty.configure(emptyConfig)],
      context,
    );
    const composition = engine.compose({ instructions: '', tools: [] });
    const model = new MockProvider([textTurn('unreachable')]);

    const events = await collect(
      run({
        ...composition,
        model,
        messages: [userMessage('go')],
        context: context.deriveChild(),
      }),
    );

    expect(model.requests).toHaveLength(0);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringMatching(/context/) }),
      ]),
    );
  });
});
