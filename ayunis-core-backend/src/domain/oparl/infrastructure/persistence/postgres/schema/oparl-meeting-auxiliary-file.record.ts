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
import { OparlMeetingRecord } from './oparl-meeting.record';

/** `auxiliaryFiles` of a meeting; the target is kept by OParl ID and linked once mirrored. */
@Entity({ name: 'oparl_meeting_auxiliary_files' })
export class OparlMeetingAuxiliaryFileRecord {
  @PrimaryColumn({ type: 'uuid' })
  ownerId: UUID;

  @ManyToOne(() => OparlMeetingRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: Relation<OparlMeetingRecord>;

  @PrimaryColumn({ type: 'text' })
  targetOparlId: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  targetId: UUID | null;

  @ManyToOne(() => OparlFileRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'targetId' })
  target: Relation<OparlFileRecord> | null;
}
