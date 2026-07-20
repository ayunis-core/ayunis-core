import { Injectable } from '@nestjs/common';
import { AcademyChapter } from 'src/domain/academy/domain/academy-chapter.entity';
import { AcademyChapterProgress } from 'src/domain/academy/domain/academy-chapter-progress.entity';
import { AcademyCompletion } from 'src/domain/academy/domain/academy-completion.entity';
import { AcademyCourseModule } from 'src/domain/academy/domain/academy-course-module.entity';
import { AcademyQuizQuestion } from 'src/domain/academy/domain/academy-quiz-question.entity';
import { AcademyChapterRecord } from '../schema/academy-chapter.record';
import { AcademyChapterProgressRecord } from '../schema/academy-chapter-progress.record';
import { AcademyCompletionRecord } from '../schema/academy-completion.record';
import { AcademyCourseModuleRecord } from '../schema/academy-course-module.record';
import { AcademyQuizQuestionRecord } from '../schema/academy-quiz-question.record';

@Injectable()
export class AcademyMapper {
  chapterToDomain(record: AcademyChapterRecord): AcademyChapter {
    return new AcademyChapter({
      id: record.id,
      title: record.title,
      description: record.description,
      position: record.position,
      quizEnabled: record.quizEnabled,
      passThreshold: record.passThreshold,
      courseModules: record.courseModules?.map((courseModule) =>
        this.courseModuleToDomain(courseModule),
      ),
      quizQuestions: record.quizQuestions?.map((quizQuestion) =>
        this.quizQuestionToDomain(quizQuestion),
      ),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  chapterToRecord(domain: AcademyChapter): AcademyChapterRecord {
    const record = new AcademyChapterRecord();
    record.id = domain.id;
    record.title = domain.title;
    record.description = domain.description;
    record.position = domain.position;
    record.quizEnabled = domain.quizEnabled;
    record.passThreshold = domain.passThreshold;
    return record;
  }

  courseModuleToDomain(record: AcademyCourseModuleRecord): AcademyCourseModule {
    return new AcademyCourseModule({
      id: record.id,
      chapterId: record.chapterId,
      title: record.title,
      description: record.description,
      loomUrl: record.loomUrl,
      position: record.position,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  courseModuleToRecord(domain: AcademyCourseModule): AcademyCourseModuleRecord {
    const record = new AcademyCourseModuleRecord();
    record.id = domain.id;
    record.chapterId = domain.chapterId;
    record.title = domain.title;
    record.description = domain.description;
    record.loomUrl = domain.loomUrl;
    record.position = domain.position;
    return record;
  }

  quizQuestionToDomain(record: AcademyQuizQuestionRecord): AcademyQuizQuestion {
    return new AcademyQuizQuestion({
      id: record.id,
      chapterId: record.chapterId,
      text: record.text,
      options: record.options,
      position: record.position,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  quizQuestionToRecord(domain: AcademyQuizQuestion): AcademyQuizQuestionRecord {
    const record = new AcademyQuizQuestionRecord();
    record.id = domain.id;
    record.chapterId = domain.chapterId;
    record.text = domain.text;
    record.options = domain.options;
    record.position = domain.position;
    return record;
  }

  chapterProgressToDomain(
    record: AcademyChapterProgressRecord,
  ): AcademyChapterProgress {
    return new AcademyChapterProgress({
      id: record.id,
      userId: record.userId,
      chapterId: record.chapterId,
      passedAt: record.passedAt,
      lastScore: record.lastScore,
      lastAttemptAt: record.lastAttemptAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  chapterProgressToRecord(
    domain: AcademyChapterProgress,
  ): AcademyChapterProgressRecord {
    const record = new AcademyChapterProgressRecord();
    record.id = domain.id;
    record.userId = domain.userId;
    record.chapterId = domain.chapterId;
    record.passedAt = domain.passedAt;
    record.lastScore = domain.lastScore;
    record.lastAttemptAt = domain.lastAttemptAt;
    return record;
  }

  completionToDomain(record: AcademyCompletionRecord): AcademyCompletion {
    return new AcademyCompletion({
      id: record.id,
      userId: record.userId,
      completedAt: record.completedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  completionToRecord(domain: AcademyCompletion): AcademyCompletionRecord {
    const record = new AcademyCompletionRecord();
    record.id = domain.id;
    record.userId = domain.userId;
    record.completedAt = domain.completedAt;
    return record;
  }
}
