export class GetUserCreditLimitsOverviewQuery {
  constructor(
    public readonly since?: Date,
    public readonly includeDefaultLimitedUsers = false,
  ) {}
}
