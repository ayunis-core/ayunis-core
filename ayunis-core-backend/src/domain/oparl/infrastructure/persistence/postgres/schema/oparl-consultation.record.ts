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
import { OparlBodyObjectBase } from './oparl-body-object-base.record';
import { OparlAgendaItemRecord } from './oparl-agenda-item.record';
import { OparlMeetingRecord } from './oparl-meeting.record';
import { OparlPaperRecord } from './oparl-paper.record';

@Entity({ name: 'oparl_consultations' })
@Unique(['systemId', 'oparlId'])
export class OparlConsultationRecord extends OparlBodyObjectBase {
  @Column({ type: 'text', nullable: true })
  role: string | null;

  @Column({ type: 'boolean', nullable: true })
  authoritative: boolean | null;

  @Column({ type: 'text', nullable: true })
  paperOparlId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  paperId: UUID | null;

  @ManyToOne(() => OparlPaperRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paperId' })
  paper: Relation<OparlPaperRecord> | null;

  @Column({ type: 'text', nullable: true })
  agendaItemOparlId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  agendaItemId: UUID | null;

  @ManyToOne(() => OparlAgendaItemRecord, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'agendaItemId' })
  agendaItem: Relation<OparlAgendaItemRecord> | null;

  @Column({ type: 'text', nullable: true })
  meetingOparlId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  meetingId: UUID | null;

  @ManyToOne(() => OparlMeetingRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'meetingId' })
  meeting: Relation<OparlMeetingRecord> | null;
}
