import { Column, Entity, OneToMany } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { AcademyCourseModuleRecord } from './academy-course-module.record';
import { AcademyQuizQuestionRecord } from './academy-quiz-question.record';

@Entity({ name: 'academy_chapters' })
export class AcademyChapterRecord extends BaseRecord {
  @Column({ nullable: false })
  title: string;

  @Column({ nullable: false, type: 'text' })
  description: string;

  @Column({ nullable: false, type: 'int' })
  position: number;

  @Column({ nullable: false, type: 'boolean', default: false })
  quizEnabled: boolean;

  @Column({ nullable: false, type: 'int', default: 80 })
  passThreshold: number;

  // Only populated when the relation is explicitly loaded
  @OneToMany(
    () => AcademyCourseModuleRecord,
    (courseModule) => courseModule.chapter,
  )
  courseModules?: AcademyCourseModuleRecord[];

  // Only populated when the relation is explicitly loaded
  @OneToMany(
    () => AcademyQuizQuestionRecord,
    (quizQuestion) => quizQuestion.chapter,
  )
  quizQuestions?: AcademyQuizQuestionRecord[];
}
