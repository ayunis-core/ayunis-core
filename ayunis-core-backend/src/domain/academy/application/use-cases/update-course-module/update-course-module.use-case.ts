import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyCourseModuleRepository } from '../../ports/academy-course-module.repository';
import { AcademyCourseModule } from '../../../domain/academy-course-module.entity';
import {
  CourseModuleNotFoundError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { UpdateCourseModuleCommand } from './update-course-module.command';

@Injectable()
export class UpdateCourseModuleUseCase {
  private readonly logger = new Logger(UpdateCourseModuleUseCase.name);

  constructor(
    private readonly courseModuleRepository: AcademyCourseModuleRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(
    command: UpdateCourseModuleCommand,
  ): Promise<AcademyCourseModule> {
    this.logger.log('Updating academy module', {
      courseModuleId: command.courseModuleId,
    });
    const existing = await this.courseModuleRepository.findOne(
      command.courseModuleId,
    );
    if (!existing) {
      throw new CourseModuleNotFoundError(command.courseModuleId);
    }
    const updated = new AcademyCourseModule({
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
    return this.courseModuleRepository.update(updated);
  }
}
