import type {
  extensionTypes,
  ExtensionContext,
  ExtensionDefinitionIdentity,
  ExtensionState,
} from './context';
import type { ExtensionContribution } from './contribution';
import { InvalidExtensionNameError } from './errors';

const EXTENSION_NAME = /^[A-Za-z][A-Za-z0-9._-]*$/;

type MaybePromise<Value> = Value | Promise<Value>;
type ConfigureArgs<Config> = [Config] extends [void] ? [] : [config: Config];

export interface ExtensionSetup<State, Api> {
  readonly state: ExtensionState<State>;
  readonly api: Api;
}

export interface ExtensionProjection<State, Api> {
  readonly state: Readonly<State>;
  readonly api: Api;
}

export interface ExtensionDefinitionSpec<
  Name extends string,
  Config,
  State,
  Api,
> {
  readonly name: Name;
  setup(
    context: ExtensionContext,
    config: Readonly<Config>,
  ): MaybePromise<ExtensionSetup<State, Api>>;
  contribute(
    projection: ExtensionProjection<State, Api>,
    config: Readonly<Config>,
  ): ExtensionContribution;
}

export interface ExtensionDefinition<
  Name extends string,
  Config,
  State,
  Api,
> extends ExtensionDefinitionIdentity {
  readonly name: Name;
  readonly setup: ExtensionDefinitionSpec<Name, Config, State, Api>['setup'];
  readonly contribute: ExtensionDefinitionSpec<
    Name,
    Config,
    State,
    Api
  >['contribute'];
  configure(...args: ConfigureArgs<Config>): ConfiguredExtension<this, Config>;
  readonly [extensionTypes]?: {
    config: Config;
    state: State;
    api: Api;
  };
}

export interface ConfiguredExtension<
  Definition extends ExtensionDefinitionIdentity = ExtensionDefinitionIdentity,
  Config = unknown,
> {
  readonly definition: Definition;
  readonly config: Readonly<Config>;
}

export type ExtensionConfig<Definition extends ExtensionDefinitionIdentity> =
  NonNullable<Definition[typeof extensionTypes]>['config'];

export type ExtensionStateValue<
  Definition extends ExtensionDefinitionIdentity,
> = NonNullable<Definition[typeof extensionTypes]>['state'];

export const defineExtension = <
  const Name extends string,
  State,
  Api,
  Config = void,
>(
  spec: ExtensionDefinitionSpec<Name, Config, State, Api>,
): ExtensionDefinition<Name, Config, State, Api> => {
  validateName(spec.name);
  const definition: ExtensionDefinition<Name, Config, State, Api> = {
    name: spec.name,
    setup: (context, config) => spec.setup(context, config),
    contribute: (projection, config) => spec.contribute(projection, config),
    configure(...args) {
      return Object.freeze({
        definition,
        config: copyAndFreeze(args[0] as Config),
      });
    },
  };
  return Object.freeze(definition);
};

const validateName = (name: string): void => {
  if (!EXTENSION_NAME.test(name)) {
    throw new InvalidExtensionNameError(name);
  }
};

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
