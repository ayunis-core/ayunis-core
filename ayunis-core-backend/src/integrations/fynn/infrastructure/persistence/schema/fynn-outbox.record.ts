import type { UUID } from 'crypto';
import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('fynn_outbox')
@Index(['orgId', 'sequence'])
export class FynnOutboxRecord {
  @PrimaryColumn({ type: 'uuid' })
  id: UUID;

  // Retain committed deliveries even if their organization is later deleted.
  @Column({ type: 'varchar' })
  orgId: UUID;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  sequence: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'uuid', nullable: true })
  claimToken: UUID | null;

  @Column({ type: 'varchar' })
  eventName: string;

  @Column({ type: 'bytea' })
  payload: Buffer;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  availableAt: Date;
}
