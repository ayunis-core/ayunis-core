import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyCourseModuleRepository } from '../../ports/academy-course-module.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import { DeleteCourseModuleCommand } from './delete-course-module.command';

@Injectable()
export class DeleteCourseModuleUseCase {
  private readonly logger = new Logger(DeleteCourseModuleUseCase.name);

  constructor(
    private readonly courseModuleRepository: AcademyCourseModuleRepository,
  ) {}

  async execute(command: DeleteCourseModuleCommand): Promise<void> {
    this.logger.log('Deleting academy module', {
      courseModuleId: command.courseModuleId,
    });
    try {
      await this.courseModuleRepository.delete(command.courseModuleId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error deleting academy module', {
        error: error as Error,
      });
      throw new UnexpectedAcademyError(error);
    }
  }
}
