import { Injectable } from '@nestjs/common';
import type { AcademyChapter } from '../../../domain/academy-chapter.entity';
import type { AcademyCourseModule } from '../../../domain/academy-course-module.entity';
import type { AcademyQuizQuestion } from '../../../domain/academy-quiz-question.entity';
import type { QuizAttemptResult } from '../../../application/use-cases/submit-chapter-quiz/submit-chapter-quiz.use-case';
import type { AcademyProgressView } from '../../../application/use-cases/get-academy-progress/get-academy-progress.use-case';
import { AcademyChapterResponseDto } from '../dto/academy-chapter-response.dto';
import { CourseModuleResponseDto } from '../dto/course-module-response.dto';
import { SuperAdminAcademyChapterResponseDto } from '../dto/super-admin-academy-chapter-response.dto';
import {
  QuizAnswerOptionResponseDto,
  QuizQuestionResponseDto,
} from '../dto/quiz-question-response.dto';
import {
  QuizAnswerOptionForTakingResponseDto,
  QuizQuestionForTakingResponseDto,
} from '../dto/quiz-question-for-taking-response.dto';
import { QuizResultResponseDto } from '../dto/quiz-result-response.dto';
import {
  AcademyProgressResponseDto,
  ChapterProgressResponseDto,
} from '../dto/academy-progress-response.dto';

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

  // Strips `isCorrect` — the learner-facing quiz never exposes correct answers.
  quizForTakingToDtoArray(
    entities: AcademyQuizQuestion[],
  ): QuizQuestionForTakingResponseDto[] {
    return entities.map((entity) => {
      const dto = new QuizQuestionForTakingResponseDto();
      dto.id = entity.id;
      dto.text = entity.text;
      dto.options = entity.options.map((option) => {
        const optionDto = new QuizAnswerOptionForTakingResponseDto();
        optionDto.text = option.text;
        return optionDto;
      });
      return dto;
    });
  }

  quizResultToDto(result: QuizAttemptResult): QuizResultResponseDto {
    const dto = new QuizResultResponseDto();
    dto.passed = result.passed;
    dto.correctCount = result.correctCount;
    dto.totalCount = result.totalCount;
    dto.requiredCount = result.requiredCount;
    dto.score = result.score;
    dto.academyCompleted = result.academyCompleted;
    return dto;
  }

  progressToDto(view: AcademyProgressView): AcademyProgressResponseDto {
    const dto = new AcademyProgressResponseDto();
    dto.chapters = view.chapters.map((chapter) => {
      const chapterDto = new ChapterProgressResponseDto();
      chapterDto.chapterId = chapter.chapterId;
      chapterDto.passed = chapter.passed;
      chapterDto.lastScore = chapter.lastScore;
      chapterDto.lastPassedAt = chapter.lastPassedAt;
      return chapterDto;
    });
    dto.academyCompletedAt = view.academyCompletedAt;
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
