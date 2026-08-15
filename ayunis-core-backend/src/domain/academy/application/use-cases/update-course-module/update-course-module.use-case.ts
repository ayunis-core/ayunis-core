import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyCourseModuleRepository } from '../../ports/academy-course-module.repository';
import { AcademyCourseModule } from 'src/domain/academy/domain/academy-course-module.entity';
import {
  CourseModuleNotFoundError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { UpdateCourseModuleCommand } from './update-course-module.command';

@Injectable()
export class UpdateCourseModuleUseCase {
  constructor(
    @InjectPinoLogger(UpdateCourseModuleUseCase.name)
    private readonly logger: PinoLogger,
    private readonly courseModuleRepository: AcademyCourseModuleRepository,
  ) {}

  async execute(
    command: UpdateCourseModuleCommand,
  ): Promise<AcademyCourseModule> {
    this.logger.info(
      {
        courseModuleId: command.courseModuleId,
      },
      'Updating academy module',
    );
    try {
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
      return await this.courseModuleRepository.update(updated);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error updating academy module',
      );
      throw new UnexpectedAcademyError(error);
    }
  }
}
