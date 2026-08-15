export type RunUsageExecutionPath = 'legacy' | 'agent_runtime';
export type RunUsageCollectionOutcome = 'success' | 'error';

export class RunUsageCollectionEvent {
  static readonly EVENT_NAME = 'run.usage-collection';

  constructor(
    public readonly executionPath: RunUsageExecutionPath,
    public readonly outcome: RunUsageCollectionOutcome,
  ) {}
}
