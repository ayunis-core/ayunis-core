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
import { OparlFileRecord } from './oparl-file.record';
import { OparlPaperRecord } from './oparl-paper.record';

/** `auxiliaryFiles` of a paper; the target is kept by OParl ID and linked once mirrored. */
@Entity({ name: 'oparl_paper_auxiliary_files' })
export class OparlPaperAuxiliaryFileRecord {
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

  @ManyToOne(() => OparlFileRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'targetId' })
  target: Relation<OparlFileRecord> | null;
}
