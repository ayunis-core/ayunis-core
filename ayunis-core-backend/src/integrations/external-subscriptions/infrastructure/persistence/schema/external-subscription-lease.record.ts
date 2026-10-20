import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { UUID } from 'crypto';

@Entity('external_subscription_leases')
export class ExternalSubscriptionLeaseRecord {
  @PrimaryColumn({ type: 'varchar' }) name: string;
  @Column({ type: 'uuid' }) ownerId: UUID;
  @Column({ type: 'timestamptz' }) expiresAt: Date;
}
