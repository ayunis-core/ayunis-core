export class GetApiKeyCreditLimitsOverviewQuery {
  constructor(
    public readonly since?: Date,
    public readonly onlyActiveKeys: boolean = false,
  ) {}
}
