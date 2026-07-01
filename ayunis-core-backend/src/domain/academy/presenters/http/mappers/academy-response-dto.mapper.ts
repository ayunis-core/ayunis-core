import { Injectable } from '@nestjs/common';
import type { AcademyChapter } from '../../../domain/academy-chapter.entity';
import type { AcademyCourseModule } from '../../../domain/academy-course-module.entity';
import { AcademyChapterResponseDto } from '../dto/academy-chapter-response.dto';
import { CourseModuleResponseDto } from '../dto/course-module-response.dto';

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
