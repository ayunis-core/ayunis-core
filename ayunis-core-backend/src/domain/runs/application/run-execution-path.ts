export const RUN_EXECUTION_PATHS = ['legacy', 'agent_runtime'] as const;

export type RunExecutionPath = (typeof RUN_EXECUTION_PATHS)[number];
