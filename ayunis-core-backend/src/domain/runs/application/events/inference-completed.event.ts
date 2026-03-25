export class InferenceCompletedEvent {
  static readonly EVENT_NAME = 'run.inference-completed';

  constructor(
    public readonly model: string,
    public readonly provider: string,
    public readonly streaming: boolean,
    public readonly durationMs: number,
    public readonly error?: string,
  ) {}
}
