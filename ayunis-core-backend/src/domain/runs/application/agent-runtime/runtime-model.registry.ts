import type { ModelProvider, RunContext } from '@ayunis/agent-runtime';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';

const RUNTIME_MODEL_REGISTRY = Symbol('ayunis:runtime-model-registry');

export type RuntimeLanguageModelResolver = (
  provider: ModelProvider,
) => LanguageModel;

export class RuntimeModelRegistry {
  private readonly modelsByProvider = new WeakMap<
    ModelProvider,
    LanguageModel
  >();
  private readonly modelsByProviderName = new Map<string, LanguageModel>();
  private readonly callErrors = new Map<string, unknown>();

  static attach(context: RunContext): RuntimeModelRegistry {
    const existing = context.get<RuntimeModelRegistry>(RUNTIME_MODEL_REGISTRY);
    if (existing) return existing;
    const registry = new RuntimeModelRegistry();
    context.set(RUNTIME_MODEL_REGISTRY, registry);
    return registry;
  }

  static fromContext(context: RunContext): RuntimeModelRegistry {
    const registry = context.get<RuntimeModelRegistry>(RUNTIME_MODEL_REGISTRY);
    if (!registry) {
      throw new Error(
        'Runtime model registry is not attached to this run context',
      );
    }
    return registry;
  }

  register(provider: ModelProvider, model: LanguageModel): void {
    const registeredByName = this.modelsByProviderName.get(provider.name);
    if (registeredByName && registeredByName !== model) {
      throw new Error('Runtime model provider name is already registered');
    }
    this.modelsByProvider.set(provider, model);
    this.modelsByProviderName.set(provider.name, model);
  }

  readonly resolve = (provider: ModelProvider): LanguageModel => {
    const model = this.modelsByProvider.get(provider);
    if (!model) {
      throw new Error('Runtime model provider is not registered');
    }
    return model;
  };

  resolveByProviderName(providerName: string): LanguageModel {
    const model = this.modelsByProviderName.get(providerName);
    if (!model) {
      throw new Error('Runtime model provider name is not registered');
    }
    return model;
  }

  recordCallError(modelCallId: string, error: unknown): void {
    this.callErrors.set(modelCallId, error);
  }

  getCallError(modelCallId: string): unknown {
    return this.callErrors.get(modelCallId);
  }
}
