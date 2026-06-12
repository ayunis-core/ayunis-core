import { UUID } from 'crypto';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { AcademyChapterRecord } from './academy-chapter.record';

@Entity({ name: 'academy_lessons' })
export class AcademyLessonRecord extends BaseRecord {
  @ManyToOne(() => AcademyChapterRecord, (chapter) => chapter.lessons, {
    onDelete: 'CASCADE',
  })
  chapter: AcademyChapterRecord;

  @Column()
  @Index()
  chapterId: UUID;

  @Column({ nullable: false })
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ nullable: false })
  loomUrl: string;

  @Column({ nullable: false, type: 'int' })
  position: number;
}
