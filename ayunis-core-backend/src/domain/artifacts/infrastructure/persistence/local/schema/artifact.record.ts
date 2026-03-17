import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { ArtifactVersionRecord } from './artifact-version.record';
import { ThreadRecord } from '../../../../../threads/infrastructure/persistence/local/schema/thread.record';
import { LetterheadRecord } from '../../../../../letterheads/infrastructure/persistence/local/schema/letterhead.record';

@Entity({ name: 'artifacts' })
export class ArtifactRecord extends BaseRecord {
  @Column()
  @Index()
  threadId: UUID;

  @ManyToOne(() => ThreadRecord, { onDelete: 'CASCADE' })
  thread: ThreadRecord;

  @Column()
  @Index()
  userId: UUID;

  @Column()
  title: string;

  @Column({ nullable: true })
  @Index()
  letterheadId: UUID | null;

  @ManyToOne(() => LetterheadRecord, { onDelete: 'SET NULL', nullable: true })
  letterhead: LetterheadRecord | null;

  @Column({ default: 1 })
  currentVersionNumber: number;

  @OneToMany(() => ArtifactVersionRecord, (version) => version.artifact, {
    cascade: true,
  })
  versions?: ArtifactVersionRecord[];
}
