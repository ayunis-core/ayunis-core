import { Column, Entity, OneToMany } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { AcademyLessonRecord } from './academy-lesson.record';

@Entity({ name: 'academy_chapters' })
export class AcademyChapterRecord extends BaseRecord {
  @Column({ nullable: false })
  title: string;

  @Column({ nullable: false, type: 'text' })
  description: string;

  @Column({ nullable: false, type: 'int' })
  position: number;

  // Only populated when the relation is explicitly loaded
  @OneToMany(() => AcademyLessonRecord, (lesson) => lesson.chapter)
  lessons?: AcademyLessonRecord[];
}
