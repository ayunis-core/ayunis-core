export class TimeSeriesPoint {
  public readonly date: Date;
  public readonly credits: number;
  public readonly requests: number;

  constructor(params: { date: Date; credits: number; requests: number }) {
    this.date = params.date;
    this.credits = params.credits;
    this.requests = params.requests;
  }
}
