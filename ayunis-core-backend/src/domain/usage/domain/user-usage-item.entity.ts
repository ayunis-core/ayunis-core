import type { UUID } from 'crypto';
import { UsageConstants } from './value-objects/usage.constants';

export class UserUsageItem {
  public readonly userId: UUID;
  public readonly userName: string;
  public readonly userEmail: string;
  public readonly tokens: number;
  public readonly requests: number;
  public readonly lastActivity: Date | null;
  public readonly isActive: boolean;

  constructor(params: {
    userId: UUID;
    userName: string;
    userEmail: string;
    tokens: number;
    requests: number;
    lastActivity: Date | null;
    isActive: boolean;
  }) {
    this.userId = params.userId;
    this.userName = params.userName;
    this.userEmail = params.userEmail;
    this.tokens = params.tokens;
    this.requests = params.requests;
    this.lastActivity = params.lastActivity;
    this.isActive = params.isActive;
  }

  /**
   * Returns the threshold date for determining active users.
   * Users with activity on or after this date are considered active.
   */
  static getActiveThresholdDate(): Date {
    const thresholdMs =
      UsageConstants.ACTIVE_USER_DAYS_THRESHOLD * 24 * 60 * 60 * 1000;
    return new Date(Date.now() - thresholdMs);
  }

  /**
   * Determines whether a user is active based on their last activity date.
   * A user is active if their last activity is within the configured threshold.
   */
  static computeIsActive(lastActivity: Date | null): boolean {
    if (!lastActivity) {
      return false;
    }
    return lastActivity >= UserUsageItem.getActiveThresholdDate();
  }
}
