import type { Hook, RunInput, Tool } from '@ayunis/agent-runtime';

export interface RuntimeExtensionInstance {
  readonly name: string;
  readonly tools?: readonly Tool[];
  readonly instructions?: string;
  readonly hooks?: readonly Hook[];
  dispose?(): Promise<void>;
}

export type RuntimeExtension<Config> = (
  config: Config,
) => RuntimeExtensionInstance | Promise<RuntimeExtensionInstance>;

export type RuntimeExtensionInitializer = () =>
  RuntimeExtensionInstance | Promise<RuntimeExtensionInstance>;

export interface RuntimeExtensionSet {
  readonly instances: readonly RuntimeExtensionInstance[];
  apply(input: RunInput): RunInput;
  dispose(): Promise<void>;
}

export const configureRuntimeExtension = <Config>(
  extension: RuntimeExtension<Config>,
  config: Config,
): RuntimeExtensionInitializer => {
  return () => extension(config);
};
