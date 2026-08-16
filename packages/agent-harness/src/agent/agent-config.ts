import type { ConfiguredExtension } from '@ayunis/agent-extensions';
import type { ToolChoice } from '@ayunis/agent-runtime';

import type { AgentConfig, AgentVariantConfig } from '../contracts/agent';
import {
  AgentConfigurationError,
  AgentVariantError,
} from '../contracts/errors';
import type { ModelResolver } from '../contracts/model-resolver';

const AGENT_NAME = /^[A-Za-z][A-Za-z0-9._-]*$/;

export interface PreparedAgentConfig<ModelSelector> {
  readonly name: string;
  readonly instructions: string;
  readonly extensions: readonly ConfiguredExtension[];
  readonly modelSelector: Readonly<ModelSelector>;
  readonly resolveModel: ModelResolver<ModelSelector>;
  readonly maxIterations?: number;
  readonly toolChoice?: ToolChoice;
}

export const prepareAgentConfig = <ModelSelector>(
  config: AgentConfig<ModelSelector>,
): PreparedAgentConfig<ModelSelector> => {
  validateBaseConfig(config);
  const extensions = copyExtensions(config.extensions);
  assertUniqueExtensions(
    extensions,
    (name) =>
      new AgentConfigurationError(
        `Extension '${name}' is configured more than once.`,
      ),
  );
  return Object.freeze({
    name: config.name,
    instructions: config.instructions,
    extensions,
    modelSelector: copyAndFreeze(config.modelSelector),
    resolveModel: config.resolveModel,
    ...(config.maxIterations === undefined
      ? {}
      : { maxIterations: config.maxIterations }),
    ...(config.toolChoice === undefined
      ? {}
      : { toolChoice: config.toolChoice }),
  });
};

export const composeAgentVariant = <ModelSelector>(
  base: PreparedAgentConfig<ModelSelector>,
  variant: AgentVariantConfig,
): PreparedAgentConfig<ModelSelector> => {
  validateVariant(variant);
  const appended = copyExtensions(variant.extensions);
  assertUniqueExtensions(
    appended,
    (name) =>
      new AgentVariantError(
        `Extension '${name}' is configured more than once in the variant.`,
      ),
  );
  const extensions = Object.freeze([...base.extensions, ...appended]);
  assertUniqueExtensions(
    extensions,
    (name) =>
      new AgentVariantError(`Extension '${name}' is already inherited.`),
  );
  return Object.freeze({
    ...base,
    name: variant.name,
    instructions: appendInstructions(base.instructions, variant.instructions),
    extensions,
  });
};

const validateBaseConfig = <ModelSelector>(
  config: AgentConfig<ModelSelector>,
): void => {
  if (!AGENT_NAME.test(config.name)) {
    throw new AgentConfigurationError(`Invalid agent name '${config.name}'.`);
  }
  if (config.instructions.length === 0) {
    throw new AgentConfigurationError('Agent instructions must not be empty.');
  }
  validateExtensions(config.extensions, AgentConfigurationError);
  if (
    Object.is(config.modelSelector, undefined) ||
    Object.is(config.modelSelector, null)
  ) {
    throw new AgentConfigurationError('A model selector is required.');
  }
  if (typeof config.resolveModel !== 'function') {
    throw new AgentConfigurationError('A model resolver callback is required.');
  }
  if (!isValidLimit(config.maxIterations)) {
    throw new AgentConfigurationError(
      'maxIterations must be a positive integer.',
    );
  }
};

const validateVariant = (variant: AgentVariantConfig): void => {
  if (!AGENT_NAME.test(variant.name)) {
    throw new AgentVariantError(`Invalid variant name '${variant.name}'.`);
  }
  if (variant.instructions?.length === 0) {
    throw new AgentVariantError('Variant instructions must not be empty.');
  }
  validateExtensions(variant.extensions, AgentVariantError);
};

const validateExtensions = (
  extensions: readonly ConfiguredExtension[] | undefined,
  ErrorType: typeof AgentConfigurationError | typeof AgentVariantError,
): void => {
  if (extensions === undefined) {
    return;
  }
  if (!Array.isArray(extensions)) {
    throw new ErrorType('Extensions must be an array.');
  }
  for (const extension of extensions as readonly unknown[]) {
    if (!isConfiguredExtension(extension)) {
      throw new ErrorType('Every extension must be configured.');
    }
  }
};

const isConfiguredExtension = (
  value: unknown,
): value is ConfiguredExtension => {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const definition: unknown = Reflect.get(value, 'definition');
  return (
    definition !== null &&
    typeof definition === 'object' &&
    typeof Reflect.get(definition, 'name') === 'string'
  );
};

const copyExtensions = (
  extensions: readonly ConfiguredExtension[] | undefined,
): readonly ConfiguredExtension[] => Object.freeze([...(extensions ?? [])]);

const assertUniqueExtensions = (
  extensions: readonly ConfiguredExtension[],
  createError: (name: string) => Error,
): void => {
  const definitions = new Set<object>();
  const names = new Set<string>();
  for (const extension of extensions) {
    const definition = extension.definition;
    if (definitions.has(definition) || names.has(definition.name)) {
      throw createError(definition.name);
    }
    definitions.add(definition);
    names.add(definition.name);
  }
};

const appendInstructions = (
  base: string,
  appended: string | undefined,
): string => (appended === undefined ? base : `${base}\n\n${appended}`);

const isValidLimit = (limit: number | undefined): boolean =>
  limit === undefined || (Number.isInteger(limit) && limit > 0);

const copyAndFreeze = <Value>(value: Value): Readonly<Value> => {
  if (Array.isArray(value)) {
    return Object.freeze(
      value.map((item: unknown) => copyAndFreeze(item)),
    ) as Value;
  }
  if (isPlainObject(value)) {
    const copied = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, copyAndFreeze(item)]),
    );
    return Object.freeze(copied) as Value;
  }
  return value;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
