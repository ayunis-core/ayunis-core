export class TimeSeriesPoint {
  public readonly date: Date;
  public readonly tokens: number;
  public readonly requests: number;

  constructor(params: { date: Date; tokens: number; requests: number }) {
    this.date = params.date;
    this.tokens = params.tokens;
    this.requests = params.requests;
  }
}
