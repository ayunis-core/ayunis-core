import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyLessonRepository } from '../../ports/academy-lesson.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import { DeleteLessonCommand } from './delete-lesson.command';

@Injectable()
export class DeleteLessonUseCase {
  private readonly logger = new Logger(DeleteLessonUseCase.name);

  constructor(private readonly lessonRepository: AcademyLessonRepository) {}

  async execute(command: DeleteLessonCommand): Promise<void> {
    this.logger.log('Deleting academy lesson', { lessonId: command.lessonId });
    try {
      await this.lessonRepository.delete(command.lessonId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error deleting academy lesson', {
        error: error as Error,
      });
      throw new UnexpectedAcademyError(error);
    }
  }
}
