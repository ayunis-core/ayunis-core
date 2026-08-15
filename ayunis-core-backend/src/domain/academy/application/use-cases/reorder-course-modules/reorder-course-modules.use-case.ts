import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyCourseModuleRepository } from '../../ports/academy-course-module.repository';
import {
  ChapterNotFoundError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { assertSameIdSet } from '../../util/reorder-validation';
import { ReorderCourseModulesCommand } from './reorder-course-modules.command';

@Injectable()
export class ReorderCourseModulesUseCase {
  constructor(
    @InjectPinoLogger(ReorderCourseModulesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly chapterRepository: AcademyChapterRepository,
    private readonly courseModuleRepository: AcademyCourseModuleRepository,
  ) {}

  async execute(command: ReorderCourseModulesCommand): Promise<void> {
    this.logger.info(
      {
        chapterId: command.chapterId,
        count: command.courseModuleIds.length,
      },
      'Reordering academy modules',
    );
    try {
      const chapter = await this.chapterRepository.findOne(command.chapterId);
      if (!chapter) {
        throw new ChapterNotFoundError(command.chapterId);
      }
      const currentIds = await this.courseModuleRepository.findIdsByChapterId(
        command.chapterId,
      );
      assertSameIdSet(currentIds, command.courseModuleIds);
      await this.courseModuleRepository.updatePositions(
        command.chapterId,
        command.courseModuleIds,
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error reordering academy modules',
      );
      throw new UnexpectedAcademyError(error);
    }
  }
}
