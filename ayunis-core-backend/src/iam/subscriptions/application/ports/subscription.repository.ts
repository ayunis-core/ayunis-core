import { UUID } from 'crypto';
import { Subscription } from '../../domain/subscription.entity';

export abstract class SubscriptionRepository {
  abstract findByOrgId(orgId: UUID): Promise<Subscription | null>;
  abstract findAll(): Promise<Subscription[]>;
  abstract create(subscription: Subscription): Promise<Subscription>;
  abstract update(subscription: Subscription): Promise<Subscription>;
  abstract delete(id: UUID): Promise<void>;
}
