import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyLessonRepository } from '../../ports/academy-lesson.repository';
import { AcademyLesson } from '../../../domain/academy-lesson.entity';
import {
  ChapterNotFoundError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { CreateLessonCommand } from './create-lesson.command';

@Injectable()
export class CreateLessonUseCase {
  private readonly logger = new Logger(CreateLessonUseCase.name);

  constructor(
    private readonly chapterRepository: AcademyChapterRepository,
    private readonly lessonRepository: AcademyLessonRepository,
  ) {}

  async execute(command: CreateLessonCommand): Promise<AcademyLesson> {
    this.logger.log('Creating academy lesson', {
      chapterId: command.chapterId,
      title: command.title,
    });
    try {
      const chapter = await this.chapterRepository.findOne(command.chapterId);
      if (!chapter) {
        throw new ChapterNotFoundError(command.chapterId);
      }
      const maxPosition = await this.lessonRepository.findMaxPosition(
        command.chapterId,
      );
      const lesson = new AcademyLesson({
        chapterId: command.chapterId,
        title: command.title,
        description: command.description,
        loomUrl: command.loomUrl,
        position: (maxPosition ?? -1) + 1,
      });
      return await this.lessonRepository.create(lesson);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error creating academy lesson', {
        error: error as Error,
      });
      throw new UnexpectedAcademyError(error);
    }
  }
}
