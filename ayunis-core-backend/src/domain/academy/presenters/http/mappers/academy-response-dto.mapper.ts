import { Injectable } from '@nestjs/common';
import type { AcademyChapter } from '../../../domain/academy-chapter.entity';
import type { AcademyCourseModule } from '../../../domain/academy-course-module.entity';
import type { AcademyQuizQuestion } from '../../../domain/academy-quiz-question.entity';
import { AcademyChapterResponseDto } from '../dto/academy-chapter-response.dto';
import { CourseModuleResponseDto } from '../dto/course-module-response.dto';
import { SuperAdminAcademyChapterResponseDto } from '../dto/super-admin-academy-chapter-response.dto';
import {
  QuizAnswerOptionResponseDto,
  QuizQuestionResponseDto,
} from '../dto/quiz-question-response.dto';

@Injectable()
export class AcademyResponseDtoMapper {
  chapterToDto(entity: AcademyChapter): AcademyChapterResponseDto {
    const dto = new AcademyChapterResponseDto();
    this.assignChapterBaseFields(dto, entity);
    return dto;
  }

  chapterToDtoArray(entities: AcademyChapter[]): AcademyChapterResponseDto[] {
    return entities.map((entity) => this.chapterToDto(entity));
  }

  chapterToSuperAdminDto(
    entity: AcademyChapter,
  ): SuperAdminAcademyChapterResponseDto {
    const dto = new SuperAdminAcademyChapterResponseDto();
    this.assignChapterBaseFields(dto, entity);
    dto.quizQuestions = entity.quizQuestions.map((quizQuestion) =>
      this.quizQuestionToDto(quizQuestion),
    );
    return dto;
  }

  chapterToSuperAdminDtoArray(
    entities: AcademyChapter[],
  ): SuperAdminAcademyChapterResponseDto[] {
    return entities.map((entity) => this.chapterToSuperAdminDto(entity));
  }

  private assignChapterBaseFields(
    dto: AcademyChapterResponseDto,
    entity: AcademyChapter,
  ): void {
    dto.id = entity.id;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.position = entity.position;
    dto.quizEnabled = entity.quizEnabled;
    dto.passThreshold = entity.passThreshold;
    dto.courseModules = entity.courseModules.map((courseModule) =>
      this.courseModuleToDto(courseModule),
    );
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
  }

  quizQuestionToDto(entity: AcademyQuizQuestion): QuizQuestionResponseDto {
    const dto = new QuizQuestionResponseDto();
    dto.id = entity.id;
    dto.chapterId = entity.chapterId;
    dto.text = entity.text;
    dto.options = entity.options.map((option) => {
      const optionDto = new QuizAnswerOptionResponseDto();
      optionDto.text = option.text;
      optionDto.isCorrect = option.isCorrect;
      return optionDto;
    });
    dto.position = entity.position;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
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
