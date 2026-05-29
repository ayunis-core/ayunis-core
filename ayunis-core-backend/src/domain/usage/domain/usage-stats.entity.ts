export class UsageStats {
  public readonly totalCredits: number;
  public readonly totalRequests: number;
  public readonly activeUsers: number;
  public readonly totalUsers: number;
  public readonly topModels: string[];

  constructor(params: {
    totalCredits: number;
    totalRequests: number;
    activeUsers: number;
    totalUsers: number;
    topModels: string[];
  }) {
    this.totalCredits = params.totalCredits;
    this.totalRequests = params.totalRequests;
    this.activeUsers = params.activeUsers;
    this.totalUsers = params.totalUsers;
    this.topModels = params.topModels;
  }
}
