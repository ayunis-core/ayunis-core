import type { UUID } from 'crypto';

export interface InferenceErrorInfo {
  message: string;
  statusCode?: number;
}

export class InferenceCompletedEvent {
  static readonly EVENT_NAME = 'run.inference-completed';

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
    public readonly model: string,
    public readonly provider: string,
    public readonly streaming: boolean,
    public readonly durationMs: number,
    public readonly error?: InferenceErrorInfo,
  ) {}
}
