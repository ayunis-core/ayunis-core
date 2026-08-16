import { defineExtension } from '@ayunis/agent-extensions';
import { describe, expect, it, vi } from 'vitest';

import {
  AgentConfigurationError,
  AgentVariantError,
} from '../contracts/errors';
import type { AgentConfig } from '../contracts/agent';
import { composeAgentVariant, prepareAgentConfig } from './agent-config';

const Capability = defineExtension({
  name: 'capability',
  setup: (ctx, config: { label: string }) => ({
    state: ctx.state(config.label),
    api: {},
  }),
  contribute: ({ state }) => ({ instructions: state }),
});

const createConfig = (
  overrides: Partial<AgentConfig<{ provider: string }>> = {},
): AgentConfig<{ provider: string }> => ({
  name: 'researcher',
  instructions: 'Research carefully.',
  extensions: [Capability.configure({ label: 'base' })],
  modelSelector: { provider: 'mock' },
  resolveModel: vi.fn(),
  maxIterations: 8,
  ...overrides,
});

describe('prepareAgentConfig', () => {
  it('copies and freezes caller-owned arrays and selector values', () => {
    const extensions = [Capability.configure({ label: 'base' })];
    const selector = { provider: 'mock' };
    const prepared = prepareAgentConfig(
      createConfig({ extensions, modelSelector: selector }),
    );

    extensions.push(Capability.configure({ label: 'later' }));
    selector.provider = 'changed';

    expect(prepared.extensions).toHaveLength(1);
    expect(prepared.modelSelector).toEqual({ provider: 'mock' });
    expect(Object.isFrozen(prepared.extensions)).toBe(true);
    expect(Object.isFrozen(prepared.modelSelector)).toBe(true);
  });

  it.each([
    ['name', { name: 'contains space' }],
    ['instructions', { instructions: '' }],
    ['extensions', { extensions: null }],
    ['model selector', { modelSelector: undefined }],
    ['resolver', { resolveModel: null }],
    ['limit', { maxIterations: 0 }],
  ])('rejects an invalid %s', (_field, override) => {
    expect(() =>
      prepareAgentConfig(
        createConfig(override as Partial<AgentConfig<{ provider: string }>>),
      ),
    ).toThrow(AgentConfigurationError);
  });

  it('rejects duplicate extension definitions by identity', () => {
    expect(() =>
      prepareAgentConfig(
        createConfig({
          extensions: [
            Capability.configure({ label: 'one' }),
            Capability.configure({ label: 'two' }),
          ],
        }),
      ),
    ).toThrow(/capability.*more than once/i);
  });

  it('rejects distinct definitions that share a stable name', () => {
    const DuplicateName = defineExtension({
      name: 'capability',
      setup: (ctx, config: Record<string, never>) => ({
        state: ctx.state(config),
        api: {},
      }),
      contribute: () => ({}),
    });

    expect(() =>
      prepareAgentConfig(
        createConfig({
          extensions: [
            Capability.configure({ label: 'one' }),
            DuplicateName.configure({}),
          ],
        }),
      ),
    ).toThrow(/capability.*more than once/i);
  });

  it('does not resolve models or initialize extensions', () => {
    const resolver = vi.fn();
    const setup = vi.fn();
    const Lazy = defineExtension({
      name: 'lazy',
      setup,
      contribute: () => ({}),
    });

    prepareAgentConfig(
      createConfig({
        extensions: [Lazy.configure()],
        resolveModel: resolver,
      }),
    );

    expect(resolver).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
  });
});

describe('composeAgentVariant', () => {
  it('appends instructions and extensions while inheriting model settings', () => {
    const resolver = vi.fn();
    const base = prepareAgentConfig(createConfig({ resolveModel: resolver }));
    const Extra = defineExtension({
      name: 'extra',
      setup: (ctx, config: Record<string, never>) => ({
        state: ctx.state(config),
        api: {},
      }),
      contribute: () => ({}),
    });

    const variant = composeAgentVariant(base, {
      name: 'researcher-with-extra',
      instructions: 'Use the extra capability.',
      extensions: [Extra.configure({})],
    });

    expect(variant.instructions).toBe(
      'Research carefully.\n\nUse the extra capability.',
    );
    expect(variant.extensions.map(({ definition }) => definition.name)).toEqual(
      ['capability', 'extra'],
    );
    expect(variant.modelSelector).toBe(base.modelSelector);
    expect(variant.resolveModel).toBe(resolver);
    expect(variant.maxIterations).toBe(8);
  });

  it('reports an extension inherited from the base', () => {
    const base = prepareAgentConfig(createConfig());
    const compose = () =>
      composeAgentVariant(base, {
        name: 'duplicate',
        extensions: [Capability.configure({ label: 'again' })],
      });

    expect(compose).toThrow(AgentVariantError);
    expect(compose).toThrow("Extension 'capability' is already inherited.");
  });

  it('reports an extension configured more than once in the variant', () => {
    const base = prepareAgentConfig(createConfig());
    const Extra = defineExtension({
      name: 'extra',
      setup: (ctx, config: Record<string, never>) => ({
        state: ctx.state(config),
        api: {},
      }),
      contribute: () => ({}),
    });
    const compose = () =>
      composeAgentVariant(base, {
        name: 'duplicate',
        extensions: [Extra.configure({}), Extra.configure({})],
      });

    expect(compose).toThrow(AgentVariantError);
    expect(compose).toThrow(
      "Extension 'extra' is configured more than once in the variant.",
    );
  });

  it('validates the variant name and optional instructions', () => {
    const base = prepareAgentConfig(createConfig());

    expect(() => composeAgentVariant(base, { name: 'bad name' })).toThrow(
      AgentVariantError,
    );
    expect(() =>
      composeAgentVariant(base, { name: 'valid', instructions: '' }),
    ).toThrow(AgentVariantError);
  });
});
