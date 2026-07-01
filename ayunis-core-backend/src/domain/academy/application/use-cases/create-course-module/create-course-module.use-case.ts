import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyCourseModuleRepository } from '../../ports/academy-course-module.repository';
import { AcademyCourseModule } from '../../../domain/academy-course-module.entity';
import {
  ChapterNotFoundError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { CreateCourseModuleCommand } from './create-course-module.command';

@Injectable()
export class CreateCourseModuleUseCase {
  private readonly logger = new Logger(CreateCourseModuleUseCase.name);

  constructor(
    private readonly chapterRepository: AcademyChapterRepository,
    private readonly courseModuleRepository: AcademyCourseModuleRepository,
  ) {}

  async execute(
    command: CreateCourseModuleCommand,
  ): Promise<AcademyCourseModule> {
    this.logger.log('Creating academy module', {
      chapterId: command.chapterId,
      title: command.title,
    });
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
      this.logger.error('Error creating academy module', {
        error: error as Error,
      });
      throw new UnexpectedAcademyError(error);
    }
  }
}
