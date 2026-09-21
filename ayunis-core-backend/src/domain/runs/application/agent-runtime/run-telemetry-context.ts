import type { RunContext } from '@ayunis/agent-runtime';
import { assistantMessageId } from 'src/domain/runs/application/agent-runtime/message-id';

const ITERATION_KEY = 'agentTelemetryIteration';
const MODEL_KEY = 'agentTelemetryModel';
const PROVIDER_KEY = 'agentTelemetryProvider';
const STARTED_AT_KEY = 'agentTelemetryStartedAt';

export interface RunTelemetryIdentity {
  run_id: string;
  request_id: string;
  model: string;
  provider: string;
  environment: string;
  iteration: number;
}

export function setRunTelemetryModel(
  context: RunContext,
  model: string,
  provider: string,
): void {
  context.set(MODEL_KEY, model);
  context.set(PROVIDER_KEY, provider);
}

export function setRunTelemetryIteration(
  context: RunContext,
  iteration: number,
): void {
  context.set(ITERATION_KEY, iteration);
}

export function setRunTelemetryStartedAt(
  context: RunContext,
  startedAt: number,
): void {
  context.set(STARTED_AT_KEY, startedAt);
}

export function getRunTelemetryStartedAt(
  context: RunContext,
): number | undefined {
  return context.get<number>(STARTED_AT_KEY);
}

export function getRunTelemetryModel(context: RunContext): {
  model: string;
  provider: string;
} {
  return {
    model: context.get<string>(MODEL_KEY) ?? 'unknown',
    provider: context.get<string>(PROVIDER_KEY) ?? 'unknown',
  };
}

export function getRunTelemetryIteration(context: RunContext): number {
  return context.get<number>(ITERATION_KEY) ?? -1;
}

export function buildRunTelemetryIdentity(
  context: RunContext,
  model: string,
  provider: string,
  iteration = getRunTelemetryIteration(context),
): RunTelemetryIdentity {
  return {
    run_id: context.runId,
    request_id: assistantMessageId(context.runId, iteration),
    model,
    provider,
    environment: getTelemetryEnvironment(),
    iteration,
  };
}

export function getTelemetryEnvironment(): string {
  return process.env.APPSIGNAL_APP_ENV ?? process.env.NODE_ENV ?? 'development';
}
