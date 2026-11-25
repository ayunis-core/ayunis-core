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
import { OparlPaperRecord } from './oparl-paper.record';
import { OparlPersonRecord } from './oparl-person.record';

/** `originatorPersons` of a paper; the target is kept by OParl ID and linked once mirrored. */
@Entity({ name: 'oparl_paper_originator_persons' })
export class OparlPaperOriginatorPersonRecord {
  @PrimaryColumn({ type: 'uuid' })
  ownerId: UUID;

  @ManyToOne(() => OparlPaperRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: Relation<OparlPaperRecord>;

  @PrimaryColumn({ type: 'text' })
  targetOparlId: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  targetId: UUID | null;

  @ManyToOne(() => OparlPersonRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'targetId' })
  target: Relation<OparlPersonRecord> | null;
}
