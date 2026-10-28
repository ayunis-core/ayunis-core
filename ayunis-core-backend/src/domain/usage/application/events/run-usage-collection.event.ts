export const RUN_USAGE_EXECUTION_PATHS = ['legacy', 'agent_runtime'] as const;
export type RunUsageExecutionPath = (typeof RUN_USAGE_EXECUTION_PATHS)[number];
export type RunUsageCollectionOutcome = 'success' | 'error';

export class RunUsageCollectionEvent {
  static readonly EVENT_NAME = 'run.usage-collection';

  constructor(
    public readonly executionPath: RunUsageExecutionPath,
    public readonly outcome: RunUsageCollectionOutcome,
  ) {}
}
