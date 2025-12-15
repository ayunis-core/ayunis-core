export class UsageStats {
  public readonly totalTokens: number;
  public readonly totalRequests: number;
  public readonly activeUsers: number;
  public readonly totalUsers: number;
  public readonly topModels: string[];

  constructor(params: {
    totalTokens: number;
    totalRequests: number;
    activeUsers: number;
    totalUsers: number;
    topModels: string[];
  }) {
    this.totalTokens = params.totalTokens;
    this.totalRequests = params.totalRequests;
    this.activeUsers = params.activeUsers;
    this.totalUsers = params.totalUsers;
    this.topModels = params.topModels;
  }
}
