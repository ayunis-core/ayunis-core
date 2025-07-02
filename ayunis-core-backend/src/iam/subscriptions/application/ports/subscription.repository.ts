import { UUID } from 'crypto';
import { Subscription } from '../../domain/subscription.entity';

export abstract class SubscriptionRepository {
  abstract findByOrgId(orgId: UUID): Promise<Subscription | null>;
  abstract create(subscription: Subscription): Promise<void>;
  abstract update(subscription: Subscription): Promise<void>;
  abstract delete(id: UUID): Promise<void>;
}
