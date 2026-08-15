import type { Hook, RunInput, Tool } from '@ayunis/agent-runtime';

import type {
  RuntimeExtensionInitializer,
  RuntimeExtensionInstance,
  RuntimeExtensionSet,
} from './runtime-extension';

interface StaticManifest {
  readonly tools: readonly Tool[];
  readonly instructions: readonly string[];
  readonly hooks: readonly Hook[];
}

class InitializedExtensionSet implements RuntimeExtensionSet {
  readonly instances: readonly RuntimeExtensionInstance[];
  private readonly manifest: StaticManifest;
  private disposed = false;

  constructor(instances: readonly RuntimeExtensionInstance[]) {
    this.instances = [...instances];
    this.manifest = collectManifest(instances);
  }

  apply(input: RunInput): RunInput {
    if (!hasStaticParts(this.manifest)) {
      return input;
    }
    validateHostTools(input.tools ?? [], this.manifest.tools);

    return {
      ...input,
      instructions: appendInstructions(
        input.instructions,
        this.manifest.instructions,
      ),
      ...(this.manifest.tools.length > 0
        ? { tools: [...(input.tools ?? []), ...this.manifest.tools] }
        : {}),
      ...(this.manifest.hooks.length > 0
        ? { hooks: [...(input.hooks ?? []), ...this.manifest.hooks] }
        : {}),
    };
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    await disposeInstances(this.instances);
  }
}

export const initializeExtensionSet = async (
  initializers: readonly RuntimeExtensionInitializer[],
): Promise<RuntimeExtensionSet> => {
  const instances: RuntimeExtensionInstance[] = [];
  const extensionNames = new Set<string>();
  const toolNames = new Set<string>();

  try {
    for (const initialize of initializers) {
      const instance = await initialize();
      instances.push(instance);
      validateInstance(instance, extensionNames, toolNames);
    }
    return new InitializedExtensionSet(instances);
  } catch (error) {
    return rollbackInitialization(instances, error);
  }
};

const validateInstance = (
  instance: RuntimeExtensionInstance,
  extensionNames: Set<string>,
  toolNames: Set<string>,
): void => {
  if (extensionNames.has(instance.name)) {
    throw new Error(`Duplicate runtime extension name: ${instance.name}`);
  }
  extensionNames.add(instance.name);

  for (const extensionTool of instance.tools ?? []) {
    if (toolNames.has(extensionTool.name)) {
      throw new Error(
        `Duplicate runtime extension tool name: ${extensionTool.name}`,
      );
    }
    toolNames.add(extensionTool.name);
  }
};

const collectManifest = (
  instances: readonly RuntimeExtensionInstance[],
): StaticManifest => ({
  tools: instances.flatMap(({ tools }) => tools ?? []),
  instructions: instances.flatMap(({ instructions }) =>
    instructions === undefined ? [] : [instructions],
  ),
  hooks: instances.flatMap(({ hooks }) => hooks ?? []),
});

const hasStaticParts = (manifest: StaticManifest): boolean =>
  manifest.tools.length > 0 ||
  manifest.instructions.length > 0 ||
  manifest.hooks.length > 0;

const appendInstructions = (
  hostInstructions: string,
  extensionInstructions: readonly string[],
): string => {
  return [hostInstructions, ...extensionInstructions]
    .filter((instructions) => instructions.length > 0)
    .join('\n\n');
};

const validateHostTools = (
  hostTools: readonly Tool[],
  extensionTools: readonly Tool[],
): void => {
  const hostNames = new Set(hostTools.map(({ name }) => name));
  for (const extensionTool of extensionTools) {
    if (hostNames.has(extensionTool.name)) {
      throw new Error(
        `Runtime extension tool conflicts with host tool: ${extensionTool.name}`,
      );
    }
  }
};

const disposeInstances = async (
  instances: readonly RuntimeExtensionInstance[],
): Promise<void> => {
  const errors: unknown[] = [];
  for (const instance of instances.toReversed()) {
    try {
      await instance.dispose?.();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to dispose runtime extensions');
  }
};

const rollbackInitialization = async (
  instances: readonly RuntimeExtensionInstance[],
  initializationError: unknown,
): Promise<never> => {
  try {
    await disposeInstances(instances);
  } catch (rollbackError) {
    throw new AggregateError(
      [initializationError, rollbackError],
      'Runtime extension initialization and rollback failed',
      { cause: initializationError },
    );
  }
  throw initializationError;
};
