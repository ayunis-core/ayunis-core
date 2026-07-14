import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyCourseModuleRepository } from '../../ports/academy-course-module.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import { DeleteCourseModuleCommand } from './delete-course-module.command';

@Injectable()
export class DeleteCourseModuleUseCase {
  private readonly logger = new Logger(DeleteCourseModuleUseCase.name);

  constructor(
    private readonly courseModuleRepository: AcademyCourseModuleRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(command: DeleteCourseModuleCommand): Promise<void> {
    this.logger.log('Deleting academy module', {
      courseModuleId: command.courseModuleId,
    });
    await this.courseModuleRepository.delete(command.courseModuleId);
  }
}
