export type {
  ExtensionApi,
  ExtensionCleanup,
  ExtensionContext,
  ExtensionDefinitionIdentity,
  ExtensionState,
} from './extensions/context';
export type { ExtensionContribution } from './extensions/contribution';
export {
  DuplicateExtensionError,
  ExtensionError,
  InvalidExtensionNameError,
  MissingExtensionError,
} from './extensions/errors';
export type { ExtensionErrorCode } from './extensions/errors';
export { defineExtension } from './extensions/extension';
export type {
  ConfiguredExtension,
  ExtensionConfig,
  ExtensionDefinition,
  ExtensionDefinitionSpec,
  ExtensionProjection,
  ExtensionSetup,
  ExtensionStateValue,
} from './extensions/extension';
