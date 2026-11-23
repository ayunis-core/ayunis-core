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
import { OparlFileRecord } from './oparl-file.record';
import { OparlLocationRecord } from './oparl-location.record';

@Entity({ name: 'oparl_meetings' })
@Unique(['systemId', 'oparlId'])
@Index(['bodyId', 'start'])
export class OparlMeetingRecord extends OparlBodyObjectBase {
  @Column({ type: 'text', nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  meetingState: string | null;

  @Column({ type: 'boolean', nullable: true })
  cancelled: boolean | null;

  @Column({ type: 'timestamptz', nullable: true })
  start: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  end: Date | null;

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

  @Column({ type: 'text', nullable: true })
  invitationOparlId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  invitationId: UUID | null;

  @ManyToOne(() => OparlFileRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invitationId' })
  invitation: Relation<OparlFileRecord> | null;

  @Column({ type: 'text', nullable: true })
  resultsProtocolOparlId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  resultsProtocolId: UUID | null;

  @ManyToOne(() => OparlFileRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resultsProtocolId' })
  resultsProtocol: Relation<OparlFileRecord> | null;

  @Column({ type: 'text', nullable: true })
  verbatimProtocolOparlId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  verbatimProtocolId: UUID | null;

  @ManyToOne(() => OparlFileRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verbatimProtocolId' })
  verbatimProtocol: Relation<OparlFileRecord> | null;
}
