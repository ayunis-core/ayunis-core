import type { UUID } from 'crypto';
import { Column, Entity, Index, ManyToOne, Unique } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { AcademyChapterRecord } from './academy-chapter.record';

@Entity({ name: 'academy_chapter_confirmations' })
@Unique('UQ_academy_chapter_confirmations_userId_chapterId', [
  'userId',
  'chapterId',
])
export class AcademyChapterConfirmationRecord extends BaseRecord {
  @Column()
  @Index()
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  user: UserRecord;

  @Column()
  chapterId: UUID;

  @ManyToOne(() => AcademyChapterRecord, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  chapter: AcademyChapterRecord;

  @Column({ nullable: false, type: 'timestamp' })
  confirmedAt: Date;
}
