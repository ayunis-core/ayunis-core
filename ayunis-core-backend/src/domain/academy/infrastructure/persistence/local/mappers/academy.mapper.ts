import { Injectable } from '@nestjs/common';
import { AcademyChapter } from '../../../../domain/academy-chapter.entity';
import { AcademyCourseModule } from '../../../../domain/academy-course-module.entity';
import { AcademyQuizQuestion } from '../../../../domain/academy-quiz-question.entity';
import { AcademyChapterRecord } from '../schema/academy-chapter.record';
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
}
