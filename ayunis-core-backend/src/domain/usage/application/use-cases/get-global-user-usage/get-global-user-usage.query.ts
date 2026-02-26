export class GetGlobalUserUsageQuery {
  public readonly startDate?: Date;
  public readonly endDate?: Date;

  constructor(params: { startDate?: Date; endDate?: Date }) {
    this.startDate = params.startDate;
    this.endDate = params.endDate;
  }
}
