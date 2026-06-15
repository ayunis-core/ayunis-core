import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyLessonRepository } from '../../ports/academy-lesson.repository';
import {
  ChapterNotFoundError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { assertSameIdSet } from '../../reorder-validation';
import { ReorderLessonsCommand } from './reorder-lessons.command';

@Injectable()
export class ReorderLessonsUseCase {
  private readonly logger = new Logger(ReorderLessonsUseCase.name);

  constructor(
    private readonly chapterRepository: AcademyChapterRepository,
    private readonly lessonRepository: AcademyLessonRepository,
  ) {}

  async execute(command: ReorderLessonsCommand): Promise<void> {
    this.logger.log('Reordering academy lessons', {
      chapterId: command.chapterId,
      count: command.lessonIds.length,
    });
    try {
      const chapter = await this.chapterRepository.findOne(command.chapterId);
      if (!chapter) {
        throw new ChapterNotFoundError(command.chapterId);
      }
      const currentIds = await this.lessonRepository.findIdsByChapterId(
        command.chapterId,
      );
      assertSameIdSet(currentIds, command.lessonIds);
      await this.lessonRepository.updatePositions(
        command.chapterId,
        command.lessonIds,
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error reordering academy lessons', {
        error: error as Error,
      });
      throw new UnexpectedAcademyError(error);
    }
  }
}
