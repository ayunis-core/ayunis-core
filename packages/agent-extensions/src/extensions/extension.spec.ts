import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import type { ExtensionContext } from './context';
import {
  DuplicateExtensionError,
  InvalidExtensionNameError,
  MissingExtensionError,
} from './errors';
import { defineExtension } from './extension';

const Counter = defineExtension({
  name: 'counter',
  setup(ctx, config: { initial: number; labels: string[] }) {
    const state = ctx.state(config.initial);
    return {
      state,
      api: {
        increment: () => state.update((current) => current + 1),
      },
    };
  },
  contribute({ state, api }) {
    expectTypeOf(state).toEqualTypeOf<number>();
    expectTypeOf(api.increment).toEqualTypeOf<() => void>();
    return { instructions: `Counter: ${state}` };
  },
});

describe('defineExtension', () => {
  it('preserves definition identity and copies/freezes configuration', () => {
    const labels = ['primary'];
    const config = { initial: 1, labels };

    const configured = Counter.configure(config);
    labels.push('mutated');
    config.initial = 2;

    expect(configured.definition).toBe(Counter);
    expect(configured.config).toEqual({ initial: 1, labels: ['primary'] });
    expect(Object.isFrozen(configured.config)).toBe(true);
    expect(Object.isFrozen(configured.config.labels)).toBe(true);
  });

  it.each(['', ' space', 'contains space', '.hidden'])(
    'rejects the invalid name %j',
    (name) => {
      expect(() =>
        defineExtension({
          name,
          setup: (ctx: ExtensionContext) => ({
            state: ctx.state(null),
            api: {},
          }),
          contribute: () => ({}),
        }),
      ).toThrow(InvalidExtensionNameError);
    },
  );

  it('supports definitions without configuration', () => {
    const Stateless = defineExtension({
      name: 'stateless',
      setup: (ctx) => ({ state: ctx.state(null), api: {} }),
      contribute: () => ({}),
    });

    const configured = Stateless.configure();

    expect(configured.config).toBeUndefined();
  });

  it('does not create run state or resources while configuring', () => {
    const setup = vi.fn(
      (context: ExtensionContext, config: { enabled: boolean }) => ({
        state: context.state(config.enabled),
        api: {},
      }),
    );
    const definition = defineExtension({
      name: 'lazy',
      setup,
      contribute: () => ({}),
    });

    definition.configure({ enabled: true });

    expect(setup).not.toHaveBeenCalled();
  });

  it('types APIs returned by use and useOptional', () => {
    const consume = (ctx: ExtensionContext): void => {
      expectTypeOf(ctx.use(Counter).increment).toEqualTypeOf<() => void>();
      expectTypeOf(ctx.useOptional(Counter)?.increment).toEqualTypeOf<
        (() => void) | undefined
      >();
    };

    expect(consume).toBeTypeOf('function');
  });
});

describe('attributed extension errors', () => {
  it('attributes duplicate definitions by stable name', () => {
    const error = new DuplicateExtensionError('counter');

    expect(error).toMatchObject({
      code: 'DUPLICATE_EXTENSION',
      extensionName: 'counter',
    });
  });

  it('attributes a missing dependency to its consumer', () => {
    const error = new MissingExtensionError('skills', 'knowledge-bases');

    expect(error).toMatchObject({
      code: 'MISSING_EXTENSION',
      consumerName: 'skills',
      missingExtensionName: 'knowledge-bases',
    });
  });
});
