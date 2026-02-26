import type { UUID } from 'crypto';
import { UserUsageItem } from './user-usage-item.entity';

export class GlobalUserUsageItem extends UserUsageItem {
  public readonly organizationName: string;

  constructor(params: {
    userId: UUID;
    userName: string;
    userEmail: string;
    tokens: number;
    requests: number;
    lastActivity: Date | null;
    isActive: boolean;
    organizationName: string;
  }) {
    super(params);
    this.organizationName = params.organizationName;
  }
}
