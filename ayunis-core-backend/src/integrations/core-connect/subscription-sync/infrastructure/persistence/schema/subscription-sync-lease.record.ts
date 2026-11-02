import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { UUID } from 'crypto';

@Entity('subscription_sync_leases')
export class SubscriptionSyncLeaseRecord {
  @PrimaryColumn({ type: 'varchar' }) name: string;
  @Column({ type: 'uuid' }) ownerId: UUID;
  @Column({ type: 'timestamptz' }) expiresAt: Date;
}
