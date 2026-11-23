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
import { OparlMeetingRecord } from './oparl-meeting.record';
import { OparlOrganizationRecord } from './oparl-organization.record';

/** `organizations` of a meeting; the target is kept by OParl ID and linked once mirrored. */
@Entity({ name: 'oparl_meeting_organizations' })
export class OparlMeetingOrganizationRecord {
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

  @ManyToOne(() => OparlOrganizationRecord, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'targetId' })
  target: Relation<OparlOrganizationRecord> | null;
}
