import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { ReleaseNoteRecord } from './release-note.record';

/** A user has opened a release note; `createdAt` is when. */
@Entity({ name: 'release_note_reads' })
@Unique(['userId', 'releaseNoteId'])
export class ReleaseNoteReadRecord extends BaseRecord {
  @Column()
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @Column()
  @Index()
  releaseNoteId: UUID;

  @ManyToOne(() => ReleaseNoteRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'releaseNoteId' })
  releaseNote: ReleaseNoteRecord;
}
