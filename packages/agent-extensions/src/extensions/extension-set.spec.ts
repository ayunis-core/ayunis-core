import {
  MockProvider,
  run,
  textTurn,
  type Hook,
  type RunInput,
  type Tool,
} from '@ayunis/agent-runtime';
import { describe, expect, it, vi } from 'vitest';

import {
  configureRuntimeExtension,
  initializeExtensionSet,
  type RuntimeExtensionInitializer,
  type RuntimeExtensionInstance,
} from '../index';

const tool = (name: string): Tool => ({
  name,
  description: `${name} tool`,
  parameters: { type: 'object', properties: {} },
  execute: () => name,
});

const input = (overrides: Partial<RunInput> = {}): RunInput => ({
  instructions: 'Host instructions.',
  model: new MockProvider([textTurn('done')]),
  messages: [{ role: 'user', content: [{ type: 'text', text: 'go' }] }],
  ...overrides,
});

const consume = async (runInput: RunInput): Promise<void> => {
  for await (const event of run(runInput)) {
    if (event.type === 'run_end') {
      return;
    }
  }
};

const initializer =
  (instance: RuntimeExtensionInstance): RuntimeExtensionInitializer =>
  () =>
    instance;

describe('extension initialization and static manifests', () => {
  it('initializes factories in registration order and exposes their manifests', async () => {
    const order: string[] = [];
    const first = tool('first-tool');
    const second = tool('second-tool');
    const set = await initializeExtensionSet([
      async () => {
        order.push('first:start');
        await Promise.resolve();
        order.push('first:end');
        return { name: 'first', tools: [first] };
      },
      () => {
        order.push('second');
        return { name: 'second', tools: [second] };
      },
    ]);

    expect(order).toEqual(['first:start', 'first:end', 'second']);
    expect(set.instances.map(({ name }) => name)).toEqual(['first', 'second']);
    expect(set.instances[0].tools).toEqual([first]);
    expect(set.instances[1].tools).toEqual([second]);
  });

  it('passes factory configuration through a configured initializer', async () => {
    const extension = vi.fn((config: { name: string }) => ({
      name: config.name,
    }));

    const set = await initializeExtensionSet([
      configureRuntimeExtension(extension, { name: 'configured' }),
    ]);

    expect(extension).toHaveBeenCalledWith({ name: 'configured' });
    expect(set.instances[0].name).toBe('configured');
  });

  it('merges static parts before runStart and preserves hook order and references', async () => {
    const seen: string[] = [];
    const snapshots: Array<{
      instructions: string;
      tools: readonly string[];
    }> = [];
    const observe = (name: string): Hook => ({
      name,
      runStart: ({ instructions, tools }) => {
        seen.push(name);
        snapshots.push({
          instructions,
          tools: tools.map((entry) => entry.name),
        });
      },
    });
    const hostHook = observe('host');
    const firstHook = observe('first');
    const secondHook = observe('second');
    const hostTool = tool('host-tool');
    const set = await initializeExtensionSet([
      initializer({
        name: 'first',
        tools: [tool('first-tool')],
        instructions: 'First instructions.',
        hooks: [firstHook],
      }),
      initializer({
        name: 'second',
        tools: [tool('second-tool')],
        instructions: 'Second instructions.',
        hooks: [secondHook],
      }),
    ]);

    const applied = set.apply(input({ tools: [hostTool], hooks: [hostHook] }));
    expect(applied.hooks).toEqual([hostHook, firstHook, secondHook]);
    expect(applied.hooks?.[1]).toBe(firstHook);
    expect(applied.hooks?.[2]).toBe(secondHook);
    await consume(applied);

    expect(seen).toEqual(['host', 'first', 'second']);
    expect(snapshots).toEqual(
      Array.from({ length: 3 }, () => ({
        instructions:
          'Host instructions.\n\nFirst instructions.\n\nSecond instructions.',
        tools: ['host-tool', 'first-tool', 'second-tool'],
      })),
    );
  });

  it('adds a hook-only extension as the original hook array entries', async () => {
    const first: Hook = { name: 'first' };
    const second: Hook = { name: 'second' };
    const set = await initializeExtensionSet([
      initializer({ name: 'hooks', hooks: [first, second] }),
    ]);

    const applied = set.apply(input());

    expect(applied.hooks).toEqual([first, second]);
    expect(applied.hooks?.[0]).toBe(first);
    expect(applied.hooks?.[1]).toBe(second);
  });

  it('returns the original run input for an empty extension set', async () => {
    const set = await initializeExtensionSet([]);
    const runInput = input();

    expect(set.apply(runInput)).toBe(runInput);
  });
});

describe('manifest collision validation', () => {
  it('rejects duplicate extension names during initialization', async () => {
    await expect(
      initializeExtensionSet([
        initializer({ name: 'duplicate' }),
        initializer({ name: 'duplicate' }),
      ]),
    ).rejects.toThrow('Duplicate runtime extension name: duplicate');
  });

  it('rejects duplicate extension tools during initialization', async () => {
    await expect(
      initializeExtensionSet([
        initializer({ name: 'first', tools: [tool('duplicate')] }),
        initializer({ name: 'second', tools: [tool('duplicate')] }),
      ]),
    ).rejects.toThrow('Duplicate runtime extension tool name: duplicate');
  });

  it('rejects host and extension tool collisions when applying the manifest', async () => {
    const set = await initializeExtensionSet([
      initializer({ name: 'extension', tools: [tool('duplicate')] }),
    ]);

    expect(() => set.apply(input({ tools: [tool('duplicate')] }))).toThrow(
      'Runtime extension tool conflicts with host tool: duplicate',
    );
  });
});

describe('extension lifetime', () => {
  it('rolls back completed instances in reverse order after initialization fails', async () => {
    const events: string[] = [];

    await expect(
      initializeExtensionSet([
        async () => ({
          name: 'first',
          dispose: async () => {
            events.push('dispose:first');
          },
        }),
        async () => ({
          name: 'second',
          dispose: async () => {
            events.push('dispose:second');
          },
        }),
        async () => {
          throw new Error('initialization failed');
        },
      ]),
    ).rejects.toThrow('initialization failed');
    expect(events).toEqual(['dispose:second', 'dispose:first']);
  });

  it('disposes once in reverse order and attempts every disposer', async () => {
    const events: string[] = [];
    const set = await initializeExtensionSet([
      initializer({
        name: 'first',
        dispose: async () => {
          events.push('first');
          throw new Error('first failed');
        },
      }),
      initializer({
        name: 'second',
        dispose: async () => {
          events.push('second');
          throw new Error('second failed');
        },
      }),
      initializer({
        name: 'third',
        dispose: async () => {
          events.push('third');
        },
      }),
    ]);

    const error = await set.dispose().catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual([
      expect.objectContaining({ message: 'second failed' }),
      expect.objectContaining({ message: 'first failed' }),
    ]);
    expect(events).toEqual(['third', 'second', 'first']);

    await expect(set.dispose()).resolves.toBeUndefined();
    expect(events).toEqual(['third', 'second', 'first']);
  });
});
