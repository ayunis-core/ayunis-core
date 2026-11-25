import type { UUID } from 'crypto';
import { Column, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { OparlSystemRecord } from './oparl-system.record';

/**
 * Columns of every mirrored object: its OParl ID, unique per system, and
 * the object as received (persons without contact data).
 */
export abstract class OparlObjectBase extends BaseRecord {
  @Column({ type: 'uuid' })
  systemId: UUID;

  @ManyToOne(() => OparlSystemRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'systemId' })
  system: Relation<OparlSystemRecord>;

  @Column({ type: 'text' })
  oparlId: string;

  @Column({ type: 'text', nullable: true })
  web: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  oparlCreated: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  oparlModified: Date | null;

  @Column({ type: 'jsonb' })
  raw: object;

  /** Whether `raw` is the form a list returned, which an embedded form does not replace unless newer. */
  @Column({ type: 'boolean', default: false })
  fromListing: boolean;
}
