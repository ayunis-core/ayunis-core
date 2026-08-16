export const extensionTypes: unique symbol = Symbol('extension-types');

export interface ExtensionDefinitionIdentity {
  readonly name: string;
  readonly [extensionTypes]?: {
    config: unknown;
    state: unknown;
    api: unknown;
  };
}

export type ExtensionApi<Definition extends ExtensionDefinitionIdentity> =
  NonNullable<Definition[typeof extensionTypes]>['api'];

export type ExtensionCleanup = () => void | Promise<void>;

export interface ExtensionState<State> {
  readonly current: Readonly<State>;
  update(updater: (current: Readonly<State>) => State): void;
}

/**
 * Run-local setup context. State updates and owned cleanup automatically
 * participate in the private engine's active transaction.
 */
export interface ExtensionContext {
  readonly extensionName: string;
  state<State>(initial: State): ExtensionState<State>;
  use<Definition extends ExtensionDefinitionIdentity>(
    definition: Definition,
  ): ExtensionApi<Definition>;
  useOptional<Definition extends ExtensionDefinitionIdentity>(
    definition: Definition,
  ): ExtensionApi<Definition> | undefined;
  own(cleanup: ExtensionCleanup): void;
}
