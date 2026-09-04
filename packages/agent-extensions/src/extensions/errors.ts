export type ExtensionErrorCode =
  'INVALID_EXTENSION_NAME' | 'DUPLICATE_EXTENSION' | 'MISSING_EXTENSION';

export class ExtensionError extends Error {
  constructor(
    readonly code: ExtensionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

export class InvalidExtensionNameError extends ExtensionError {
  constructor(readonly extensionName: string) {
    super(
      'INVALID_EXTENSION_NAME',
      `Invalid extension name '${extensionName}'. Names must start with a letter and contain only letters, numbers, dots, underscores, or hyphens.`,
    );
    this.name = 'InvalidExtensionNameError';
  }
}

export class DuplicateExtensionError extends ExtensionError {
  constructor(readonly extensionName: string) {
    super(
      'DUPLICATE_EXTENSION',
      `Extension '${extensionName}' was configured more than once.`,
    );
    this.name = 'DuplicateExtensionError';
  }
}

export class MissingExtensionError extends ExtensionError {
  constructor(
    readonly consumerName: string,
    readonly missingExtensionName: string,
  ) {
    super(
      'MISSING_EXTENSION',
      `Extension '${consumerName}' requires missing extension '${missingExtensionName}'.`,
    );
    this.name = 'MissingExtensionError';
  }
}
