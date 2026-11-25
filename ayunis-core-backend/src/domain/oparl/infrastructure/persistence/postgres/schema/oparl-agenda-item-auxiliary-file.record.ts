import type { UUID } from 'crypto';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { OparlAgendaItemRecord } from './oparl-agenda-item.record';
import { OparlFileRecord } from './oparl-file.record';

/** `auxiliaryFiles` of a agenda item; the target is kept by OParl ID and linked once mirrored. */
@Entity({ name: 'oparl_agenda_item_auxiliary_files' })
export class OparlAgendaItemAuxiliaryFileRecord {
  @PrimaryColumn({ type: 'uuid' })
  ownerId: UUID;

  @ManyToOne(() => OparlAgendaItemRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: Relation<OparlAgendaItemRecord>;

  @PrimaryColumn({ type: 'text' })
  targetOparlId: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  targetId: UUID | null;

  @ManyToOne(() => OparlFileRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'targetId' })
  target: Relation<OparlFileRecord> | null;
}
