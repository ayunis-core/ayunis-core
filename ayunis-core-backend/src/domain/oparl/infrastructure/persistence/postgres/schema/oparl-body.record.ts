import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Relation,
  Unique,
} from 'typeorm';
import type { UUID } from 'crypto';
import { OparlObjectBase } from './oparl-object-base.record';
import { OparlLocationRecord } from './oparl-location.record';

@Entity({ name: 'oparl_bodies' })
@Unique(['systemId', 'oparlId'])
export class OparlBodyRecord extends OparlObjectBase {
  @Column({ type: 'text', nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  shortName: string | null;

  @Column({ type: 'text', nullable: true })
  website: string | null;

  @Column({ type: 'text', nullable: true })
  ags: string | null;

  @Column({ type: 'text', nullable: true })
  rgs: string | null;

  @Column({ type: 'text', nullable: true })
  classification: string | null;

  @Column({ type: 'text', nullable: true })
  locationOparlId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  locationId: UUID | null;

  @ManyToOne(() => OparlLocationRecord, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'locationId' })
  location: Relation<OparlLocationRecord> | null;
}
