import { Injectable } from '@nestjs/common';
import type { AcademyProgressView } from 'src/domain/academy/application/use-cases/get-academy-progress/get-academy-progress.use-case';
import type { ChapterConfirmationResult } from 'src/domain/academy/application/use-cases/confirm-chapter/confirm-chapter.use-case';
import type { AcademyChapter } from 'src/domain/academy/domain/academy-chapter.entity';
import type { AcademyCourseModule } from 'src/domain/academy/domain/academy-course-module.entity';
import { AcademyChapterResponseDto } from 'src/domain/academy/presenters/http/dto/academy-chapter-response.dto';
import {
  AcademyProgressResponseDto,
  ChapterProgressResponseDto,
} from 'src/domain/academy/presenters/http/dto/academy-progress-response.dto';
import { ChapterConfirmationResponseDto } from 'src/domain/academy/presenters/http/dto/chapter-confirmation-response.dto';
import { CourseModuleResponseDto } from 'src/domain/academy/presenters/http/dto/course-module-response.dto';

@Injectable()
export class AcademyResponseDtoMapper {
  chapterToDto(entity: AcademyChapter): AcademyChapterResponseDto {
    const dto = new AcademyChapterResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.position = entity.position;
    dto.courseModules = entity.courseModules.map((courseModule) =>
      this.courseModuleToDto(courseModule),
    );
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }

  chapterToDtoArray(entities: AcademyChapter[]): AcademyChapterResponseDto[] {
    return entities.map((entity) => this.chapterToDto(entity));
  }

  confirmationToDto(
    result: ChapterConfirmationResult,
  ): ChapterConfirmationResponseDto {
    const dto = new ChapterConfirmationResponseDto();
    dto.chapterId = result.chapterId;
    dto.confirmedAt = result.confirmedAt;
    dto.academyCompleted = result.academyCompleted;
    return dto;
  }

  progressToDto(view: AcademyProgressView): AcademyProgressResponseDto {
    const dto = new AcademyProgressResponseDto();
    dto.chapters = view.chapters.map((chapter) => {
      const chapterDto = new ChapterProgressResponseDto();
      chapterDto.chapterId = chapter.chapterId;
      chapterDto.confirmed = chapter.confirmed;
      chapterDto.confirmationValid = chapter.confirmationValid;
      chapterDto.confirmedAt = chapter.confirmedAt;
      return chapterDto;
    });
    dto.academyCompletedAt = view.academyCompletedAt;
    dto.academyCompletionExpiresAt = view.academyCompletionExpiresAt;
    return dto;
  }

  courseModuleToDto(entity: AcademyCourseModule): CourseModuleResponseDto {
    const dto = new CourseModuleResponseDto();
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
