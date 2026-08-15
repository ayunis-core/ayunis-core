import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyCourseModuleRepository } from '../../ports/academy-course-module.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import { DeleteCourseModuleCommand } from './delete-course-module.command';

@Injectable()
export class DeleteCourseModuleUseCase {
  constructor(
    @InjectPinoLogger(DeleteCourseModuleUseCase.name)
    private readonly logger: PinoLogger,
    private readonly courseModuleRepository: AcademyCourseModuleRepository,
  ) {}

  async execute(command: DeleteCourseModuleCommand): Promise<void> {
    this.logger.info(
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
