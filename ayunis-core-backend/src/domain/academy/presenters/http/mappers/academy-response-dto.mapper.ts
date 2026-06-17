import { Injectable } from '@nestjs/common';
import type { AcademyChapter } from '../../../domain/academy-chapter.entity';
import type { AcademyLesson } from '../../../domain/academy-lesson.entity';
import { AcademyChapterResponseDto } from '../dto/academy-chapter-response.dto';
import { AcademyLessonResponseDto } from '../dto/academy-lesson-response.dto';

@Injectable()
export class AcademyResponseDtoMapper {
  chapterToDto(entity: AcademyChapter): AcademyChapterResponseDto {
    const dto = new AcademyChapterResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.position = entity.position;
    dto.lessons = entity.lessons.map((lesson) => this.lessonToDto(lesson));
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }

  chapterToDtoArray(entities: AcademyChapter[]): AcademyChapterResponseDto[] {
    return entities.map((entity) => this.chapterToDto(entity));
  }

  lessonToDto(entity: AcademyLesson): AcademyLessonResponseDto {
    const dto = new AcademyLessonResponseDto();
    dto.id = entity.id;
    dto.chapterId = entity.chapterId;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.loomUrl = entity.loomUrl;
    dto.position = entity.position;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
