import { RunContext, type ModelProvider } from '@ayunis/agent-runtime';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { RuntimeModelRegistry } from './runtime-model.registry';

const provider = {
  name: 'anthropic:claude-sonnet-4-5',
  stream: jest.fn(),
} as unknown as ModelProvider;
const model = {
  name: 'claude-sonnet-4-5',
  provider: 'anthropic',
} as LanguageModel;

describe('RuntimeModelRegistry', () => {
  it('is inherited through child run contexts', () => {
    const rootContext = RunContext.create();
    const registry = RuntimeModelRegistry.attach(rootContext);
    const childContext = rootContext.deriveChild();

    expect(RuntimeModelRegistry.fromContext(rootContext)).toBe(registry);
    expect(RuntimeModelRegistry.fromContext(childContext)).toBe(registry);
  });

  it('fails closed when no registry is attached to the run context', () => {
    expect(() => RuntimeModelRegistry.fromContext(RunContext.create())).toThrow(
      'Runtime model registry is not attached to this run context',
    );
  });

  it('resolves an actual runtime provider to its backend language model', () => {
    const registry = new RuntimeModelRegistry();
    registry.register(provider, model);

    expect(registry.resolve(provider)).toBe(model);
    expect(registry.resolveByProviderName(provider.name)).toBe(model);
  });

  it('fails closed when an actual call provider was not registered', () => {
    const registry = new RuntimeModelRegistry();

    expect(() => registry.resolve(provider)).toThrow(
      'Runtime model provider is not registered',
    );
  });

  it('rejects ambiguous runtime provider names instead of misattributing calls', () => {
    const registry = new RuntimeModelRegistry();
    registry.register(provider, model);

    expect(() =>
      registry.register({ ...provider }, {
        name: 'another-model',
        provider: 'azure',
      } as LanguageModel),
    ).toThrow('Runtime model provider name is already registered');
  });

  it('retains a call error only inside the current run for terminal mapping', () => {
    const registry = new RuntimeModelRegistry();
    const error = new Error('provider rejection');

    registry.recordCallError('call-1', error);

    expect(registry.getCallError('call-1')).toBe(error);
    expect(registry.getCallError('call-2')).toBeUndefined();
  });
});
