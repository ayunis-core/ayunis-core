import { Injectable } from '@nestjs/common';
import { AcademyChapter } from '../../../../domain/academy-chapter.entity';
import { AcademyLesson } from '../../../../domain/academy-lesson.entity';
import { AcademyChapterRecord } from '../schema/academy-chapter.record';
import { AcademyLessonRecord } from '../schema/academy-lesson.record';

@Injectable()
export class AcademyMapper {
  chapterToDomain(record: AcademyChapterRecord): AcademyChapter {
    return new AcademyChapter({
      id: record.id,
      title: record.title,
      description: record.description,
      position: record.position,
      lessons: record.lessons?.map((lesson) => this.lessonToDomain(lesson)),
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
    return record;
  }

  lessonToDomain(record: AcademyLessonRecord): AcademyLesson {
    return new AcademyLesson({
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

  lessonToRecord(domain: AcademyLesson): AcademyLessonRecord {
    const record = new AcademyLessonRecord();
    record.id = domain.id;
    record.chapterId = domain.chapterId;
    record.title = domain.title;
    record.description = domain.description;
    record.loomUrl = domain.loomUrl;
    record.position = domain.position;
    return record;
  }
}
