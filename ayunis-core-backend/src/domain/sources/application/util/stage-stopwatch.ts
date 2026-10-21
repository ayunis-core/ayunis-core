type Instrument<Stage> = <T>(
  stage: Stage,
  run: () => T | Promise<T>,
) => T | Promise<T>;

/**
 * Collects wall-clock durations per pipeline stage so one job can report them
 * together as log attributes and metrics. An optional instrument wraps every
 * measured stage, e.g. to open a trace span with the same name.
 */
export class StageStopwatch<Stage extends string> {
  private readonly startedAt = performance.now();
  private readonly durations = new Map<Stage, number>();
  private failed?: Stage;

  constructor(private readonly instrument?: Instrument<Stage>) {}

  async measure<T>(stage: Stage, run: () => T | Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await (this.instrument ? this.instrument(stage, run) : run());
    } catch (error) {
      this.failed = stage;
      throw error;
    } finally {
      this.durations.set(stage, performance.now() - start);
    }
  }

  record(stage: Stage, durationMs: number): void {
    this.durations.set(stage, durationMs);
  }

  get(stage: Stage): number {
    return this.durations.get(stage) ?? 0;
  }

  get failedStage(): Stage | undefined {
    return this.failed;
  }

  elapsedMs(): number {
    return performance.now() - this.startedAt;
  }

  values(): Partial<Record<Stage, number>> {
    return Object.fromEntries(this.durations) as Partial<Record<Stage, number>>;
  }

  /** Flat, rounded `<stage>Ms` attributes for a structured log line. */
  report(): Record<string, number> {
    return Object.fromEntries(
      [...this.durations].map(([stage, ms]) => [`${stage}Ms`, Math.round(ms)]),
    );
  }
}
