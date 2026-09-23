import type { ModelCallOutcome, ModelCallTrigger } from '@ayunis/agent-runtime';
import type { UUID } from 'crypto';
import type { RunExecutionPath } from 'src/domain/runs/application/run-execution-path';

export interface InferenceErrorInfo {
  message: string;
  statusCode?: number;
}

export interface InferenceModelCallInfo {
  modelCallId: string;
  runId: string;
  turn: number;
  callSequence: number;
  trigger: ModelCallTrigger;
  outcome: ModelCallOutcome['type'];
}

export class InferenceCompletedEvent {
  static readonly EVENT_NAME = 'run.inference-completed';

  readonly modelCallId?: string;
  readonly runId?: string;
  readonly turn?: number;
  readonly callSequence?: number;
  readonly trigger?: ModelCallTrigger;
  readonly outcome?: ModelCallOutcome['type'];

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
    public readonly model: string,
    public readonly provider: string,
    public readonly streaming: boolean,
    public readonly durationMs: number,
    public readonly executionPath: RunExecutionPath,
    public readonly error?: InferenceErrorInfo,
    call?: InferenceModelCallInfo,
  ) {
    this.modelCallId = call?.modelCallId;
    this.runId = call?.runId;
    this.turn = call?.turn;
    this.callSequence = call?.callSequence;
    this.trigger = call?.trigger;
    this.outcome = call?.outcome;
  }
}
