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
import { OparlConsultationRecord } from './oparl-consultation.record';
import { OparlFileRecord } from './oparl-file.record';
import { OparlMeetingRecord } from './oparl-meeting.record';

@Entity({ name: 'oparl_agenda_items' })
@Unique(['systemId', 'oparlId'])
export class OparlAgendaItemRecord extends OparlBodyObjectBase {
  @Column({ type: 'text', nullable: true })
  number: string | null;

  @Column({ type: 'integer', nullable: true })
  order: number | null;

  @Column({ type: 'text', nullable: true })
  name: string | null;

  @Column({ type: 'boolean', nullable: true })
  public: boolean | null;

  @Column({ type: 'text', nullable: true })
  result: string | null;

  @Column({ type: 'text', nullable: true })
  resolutionText: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  start: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  end: Date | null;

  @Column({ type: 'text', nullable: true })
  meetingOparlId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  meetingId: UUID | null;

  @ManyToOne(() => OparlMeetingRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meetingId' })
  meeting: Relation<OparlMeetingRecord> | null;

  @Column({ type: 'text', nullable: true })
  consultationOparlId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  consultationId: UUID | null;

  @ManyToOne(() => OparlConsultationRecord, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'consultationId' })
  consultation: Relation<OparlConsultationRecord> | null;

  @Column({ type: 'text', nullable: true })
  resolutionFileOparlId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  resolutionFileId: UUID | null;

  @ManyToOne(() => OparlFileRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolutionFileId' })
  resolutionFile: Relation<OparlFileRecord> | null;
}
