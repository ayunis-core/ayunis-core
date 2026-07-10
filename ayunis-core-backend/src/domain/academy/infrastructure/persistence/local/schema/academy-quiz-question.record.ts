import { UUID } from 'crypto';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { AcademyChapterRecord } from './academy-chapter.record';
import type { QuizAnswerOption } from '../../../../domain/academy-quiz-question.entity';

@Entity({ name: 'academy_quiz_questions' })
export class AcademyQuizQuestionRecord extends BaseRecord {
  @Column()
  @Index()
  chapterId: UUID;

  @ManyToOne(() => AcademyChapterRecord, (chapter) => chapter.quizQuestions, {
    onDelete: 'CASCADE',
  })
  chapter: AcademyChapterRecord;

  @Column({ nullable: false, type: 'text' })
  text: string;

  @Column({ nullable: false, type: 'jsonb' })
  options: QuizAnswerOption[];

  @Column({ nullable: false, type: 'int' })
  position: number;
}
