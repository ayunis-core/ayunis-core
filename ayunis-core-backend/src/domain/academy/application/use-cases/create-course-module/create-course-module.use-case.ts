import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyCourseModuleRepository } from '../../ports/academy-course-module.repository';
import { AcademyCourseModule } from 'src/domain/academy/domain/academy-course-module.entity';
import {
  ChapterNotFoundError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { CreateCourseModuleCommand } from './create-course-module.command';

@Injectable()
export class CreateCourseModuleUseCase {
  constructor(
    @InjectPinoLogger(CreateCourseModuleUseCase.name)
    private readonly logger: PinoLogger,
    private readonly chapterRepository: AcademyChapterRepository,
    private readonly courseModuleRepository: AcademyCourseModuleRepository,
  ) {}

  async execute(
    command: CreateCourseModuleCommand,
  ): Promise<AcademyCourseModule> {
    this.logger.info(
      {
        chapterId: command.chapterId,
        title: command.title,
      },
      'Creating academy module',
    );
    try {
      const chapter = await this.chapterRepository.findOne(command.chapterId);
      if (!chapter) {
        throw new ChapterNotFoundError(command.chapterId);
      }
      const maxPosition = await this.courseModuleRepository.findMaxPosition(
        command.chapterId,
      );
      const courseModule = new AcademyCourseModule({
        chapterId: command.chapterId,
        title: command.title,
        description: command.description,
        loomUrl: command.loomUrl,
        position: (maxPosition ?? -1) + 1,
      });
      return await this.courseModuleRepository.create(courseModule);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error creating academy module',
      );
      throw new UnexpectedAcademyError(error);
    }
  }
}
