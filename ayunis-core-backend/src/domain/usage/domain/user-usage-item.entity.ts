import { UUID } from 'crypto';

export class UserUsageItem {
  public readonly userId: UUID;
  public readonly userName: string;
  public readonly userEmail: string;
  public readonly tokens: number;
  public readonly requests: number;
  public readonly cost: number | undefined;
  public readonly lastActivity: Date | null;
  public readonly isActive: boolean;

  constructor(params: {
    userId: UUID;
    userName: string;
    userEmail: string;
    tokens: number;
    requests: number;
    cost?: number;
    lastActivity: Date | null;
    isActive: boolean;
  }) {
    this.userId = params.userId;
    this.userName = params.userName;
    this.userEmail = params.userEmail;
    this.tokens = params.tokens;
    this.requests = params.requests;
    this.cost = params.cost;
    this.lastActivity = params.lastActivity;
    this.isActive = params.isActive;
  }
}
