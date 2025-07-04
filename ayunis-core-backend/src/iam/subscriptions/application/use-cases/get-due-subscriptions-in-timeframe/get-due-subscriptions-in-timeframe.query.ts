export class GetDueSubscriptionsInTimeframeQuery {
  public readonly from: Date;
  public readonly to: Date;

  constructor(params: { from: Date; to: Date }) {
    this.from = params.from;
    this.to = params.to;
  }
}
