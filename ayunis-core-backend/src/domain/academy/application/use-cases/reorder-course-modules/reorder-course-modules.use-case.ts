import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from 'src/domain/academy/application/ports/academy-chapter.repository';
import { AcademyCourseModuleRepository } from 'src/domain/academy/application/ports/academy-course-module.repository';
import {
  ChapterNotFoundError,
  UnexpectedAcademyError,
} from 'src/domain/academy/application/academy.errors';
import { assertSameIdSet } from 'src/domain/academy/application/util/reorder-validation';
import { ReorderCourseModulesCommand } from './reorder-course-modules.command';

@Injectable()
export class ReorderCourseModulesUseCase {
  private readonly logger = new Logger(ReorderCourseModulesUseCase.name);

  constructor(
    private readonly chapterRepository: AcademyChapterRepository,
    private readonly courseModuleRepository: AcademyCourseModuleRepository,
  ) {}

  async execute(command: ReorderCourseModulesCommand): Promise<void> {
    this.logger.log(
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
