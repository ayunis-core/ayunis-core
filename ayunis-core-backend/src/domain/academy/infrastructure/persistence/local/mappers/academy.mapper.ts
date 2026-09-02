import { Injectable } from '@nestjs/common';
import { AcademyChapter } from 'src/domain/academy/domain/academy-chapter.entity';
import { AcademyChapterConfirmation } from 'src/domain/academy/domain/academy-chapter-confirmation.entity';
import { AcademyCompletion } from 'src/domain/academy/domain/academy-completion.entity';
import { AcademyCourseModule } from 'src/domain/academy/domain/academy-course-module.entity';
import { AcademyChapterRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-chapter.record';
import { AcademyChapterConfirmationRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-chapter-confirmation.record';
import { AcademyCompletionRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-completion.record';
import { AcademyCourseModuleRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-course-module.record';

@Injectable()
export class AcademyMapper {
  chapterToDomain(record: AcademyChapterRecord): AcademyChapter {
    return new AcademyChapter({
      id: record.id,
      title: record.title,
      description: record.description,
      position: record.position,
      courseModules: record.courseModules?.map((courseModule) =>
        this.courseModuleToDomain(courseModule),
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

  chapterConfirmationToDomain(
    record: AcademyChapterConfirmationRecord,
  ): AcademyChapterConfirmation {
    return new AcademyChapterConfirmation({
      id: record.id,
      userId: record.userId,
      chapterId: record.chapterId,
      confirmedAt: record.confirmedAt,
    });
  }

  chapterConfirmationToRecord(
    domain: AcademyChapterConfirmation,
  ): AcademyChapterConfirmationRecord {
    const record = new AcademyChapterConfirmationRecord();
    record.id = domain.id;
    record.userId = domain.userId;
    record.chapterId = domain.chapterId;
    record.confirmedAt = domain.confirmedAt;
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
