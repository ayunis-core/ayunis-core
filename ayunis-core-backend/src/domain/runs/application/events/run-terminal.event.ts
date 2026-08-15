import type { RunExecutionPath } from '../run-execution-path';

export const RUN_TERMINAL_OUTCOMES = [
  'completed',
  'aborted',
  'error',
  'max_iterations',
] as const;

export type RunTerminalOutcome = (typeof RUN_TERMINAL_OUTCOMES)[number];

export class RunTerminalEvent {
  static readonly EVENT_NAME = 'run.terminal';

  constructor(
    public readonly executionPath: RunExecutionPath,
    public readonly outcome: RunTerminalOutcome,
    public readonly durationMs: number,
  ) {}
}
