import { UUID } from 'crypto';
import { Column, Entity, Index, ManyToOne, Unique } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { AcademyChapterRecord } from './academy-chapter.record';

@Entity({ name: 'academy_chapter_progress' })
@Unique('UQ_academy_chapter_progress_userId_chapterId', ['userId', 'chapterId'])
export class AcademyChapterProgressRecord extends BaseRecord {
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

  @Column({ nullable: true, type: 'timestamp' })
  passedAt: Date | null;

  @Column({ nullable: false, type: 'int' })
  lastScore: number;

  @Column({ nullable: false, type: 'timestamp' })
  lastAttemptAt: Date;
}
