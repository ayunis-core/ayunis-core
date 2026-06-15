import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyLessonRepository } from '../../ports/academy-lesson.repository';
import { AcademyLesson } from '../../../domain/academy-lesson.entity';
import {
  LessonNotFoundError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { UpdateLessonCommand } from './update-lesson.command';

@Injectable()
export class UpdateLessonUseCase {
  private readonly logger = new Logger(UpdateLessonUseCase.name);

  constructor(private readonly lessonRepository: AcademyLessonRepository) {}

  async execute(command: UpdateLessonCommand): Promise<AcademyLesson> {
    this.logger.log('Updating academy lesson', { lessonId: command.lessonId });
    try {
      const existing = await this.lessonRepository.findOne(command.lessonId);
      if (!existing) {
        throw new LessonNotFoundError(command.lessonId);
      }
      const updated = new AcademyLesson({
        id: existing.id,
        chapterId: existing.chapterId,
        title: command.title,
        description:
          command.description === undefined
            ? existing.description
            : command.description,
        loomUrl: command.loomUrl,
        position: existing.position,
        createdAt: existing.createdAt,
        updatedAt: new Date(),
      });
      return await this.lessonRepository.update(updated);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error updating academy lesson', {
        error: error as Error,
      });
      throw new UnexpectedAcademyError(error);
    }
  }
}
