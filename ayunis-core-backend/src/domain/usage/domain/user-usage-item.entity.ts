import { UUID } from 'crypto';
import { ModelBreakdownItem } from './model-breakdown-item.entity';

export class UserUsageItem {
  constructor(
    public readonly userId: UUID,
    public readonly userName: string,
    public readonly userEmail: string,
    public readonly tokens: number,
    public readonly requests: number,
    public readonly cost: number | undefined,
    public readonly lastActivity: Date | null,
    public readonly isActive: boolean,
    public readonly modelBreakdown: ModelBreakdownItem[],
  ) {}
}
