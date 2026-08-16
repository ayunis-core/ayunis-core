export type AgentHarnessErrorCode =
  | 'INVALID_AGENT_CONFIGURATION'
  | 'INVALID_AGENT_VARIANT'
  | 'MODEL_RESOLUTION_FAILED';

export class AgentHarnessError extends Error {
  constructor(
    readonly code: AgentHarnessErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'AgentHarnessError';
  }
}

export class AgentConfigurationError extends AgentHarnessError {
  constructor(message: string) {
    super('INVALID_AGENT_CONFIGURATION', message);
    this.name = 'AgentConfigurationError';
  }
}

export class AgentVariantError extends AgentHarnessError {
  constructor(message: string) {
    super('INVALID_AGENT_VARIANT', message);
    this.name = 'AgentVariantError';
  }
}

export class ModelResolutionError extends AgentHarnessError {
  constructor(
    readonly agentName: string,
    cause?: unknown,
  ) {
    super(
      'MODEL_RESOLUTION_FAILED',
      `Failed to resolve a model for agent '${agentName}'.`,
      cause,
    );
    this.name = 'ModelResolutionError';
  }
}
