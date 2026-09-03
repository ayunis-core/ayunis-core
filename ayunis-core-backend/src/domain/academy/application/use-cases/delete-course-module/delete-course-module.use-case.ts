import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyCourseModuleRepository } from 'src/domain/academy/application/ports/academy-course-module.repository';
import { UnexpectedAcademyError } from 'src/domain/academy/application/academy.errors';
import { DeleteCourseModuleCommand } from './delete-course-module.command';

@Injectable()
export class DeleteCourseModuleUseCase {
  private readonly logger = new Logger(DeleteCourseModuleUseCase.name);

  constructor(
    private readonly courseModuleRepository: AcademyCourseModuleRepository,
  ) {}

  async execute(command: DeleteCourseModuleCommand): Promise<void> {
    this.logger.log(
      {
        courseModuleId: command.courseModuleId,
      },
      'Deleting academy module',
    );
    try {
      await this.courseModuleRepository.delete(command.courseModuleId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error deleting academy module',
      );
      throw new UnexpectedAcademyError(error);
    }
  }
}
