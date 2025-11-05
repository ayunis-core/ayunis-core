export class TimeSeriesPoint {
  constructor(
    public readonly date: Date,
    public readonly tokens: number,
    public readonly requests: number,
    public readonly cost?: number,
  ) {}
}
