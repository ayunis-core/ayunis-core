import type { RunExecutionPath } from '../run-execution-path';

export type RunToolOutcome = 'success' | 'error' | 'aborted';

export class RunToolCompletedEvent {
  static readonly EVENT_NAME = 'run.tool-completed';

  constructor(
    public readonly executionPath: RunExecutionPath,
    public readonly outcome: RunToolOutcome,
  ) {}
}
