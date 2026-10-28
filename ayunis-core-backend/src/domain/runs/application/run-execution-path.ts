import {
  RUN_USAGE_EXECUTION_PATHS,
  type RunUsageExecutionPath,
} from 'src/domain/usage/application/events/run-usage-collection.event';

// Usage owns the execution-path vocabulary because it records it; runs only
// names it for its own events and telemetry.
export const RUN_EXECUTION_PATHS = RUN_USAGE_EXECUTION_PATHS;
export type RunExecutionPath = RunUsageExecutionPath;
