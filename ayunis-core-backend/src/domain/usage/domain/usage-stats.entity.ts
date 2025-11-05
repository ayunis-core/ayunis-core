export class UsageStats {
  constructor(
    public readonly totalTokens: number,
    public readonly totalRequests: number,
    public readonly totalCost: number | undefined,
    public readonly currency: string | undefined,
    public readonly activeUsers: number,
    public readonly totalUsers: number,
    public readonly topModels: string[],
  ) {}
}
