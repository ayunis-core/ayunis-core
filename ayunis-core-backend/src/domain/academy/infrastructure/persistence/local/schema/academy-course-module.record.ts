import { UUID } from 'crypto';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { AcademyChapterRecord } from './academy-chapter.record';

@Entity({ name: 'academy_course_modules' })
export class AcademyCourseModuleRecord extends BaseRecord {
  @Column()
  @Index()
  chapterId: UUID;

  @ManyToOne(() => AcademyChapterRecord, (chapter) => chapter.courseModules, {
    onDelete: 'CASCADE',
  })
  chapter: AcademyChapterRecord;

  @Column({ nullable: false })
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ nullable: false })
  loomUrl: string;

  @Column({ nullable: false, type: 'int' })
  position: number;
}
