import { SubscriptionType } from './value-objects/subscription-type.enum';
import { Subscription, type SubscriptionParams } from './subscription.entity';

export interface UsageBasedSubscriptionParams extends SubscriptionParams {
  monthlyCredits: number;
}

export class UsageBasedSubscription extends Subscription {
  readonly type = SubscriptionType.USAGE_BASED;
  monthlyCredits: number;

  constructor(params: UsageBasedSubscriptionParams) {
    super(params);
    this.monthlyCredits = params.monthlyCredits;
  }
}
