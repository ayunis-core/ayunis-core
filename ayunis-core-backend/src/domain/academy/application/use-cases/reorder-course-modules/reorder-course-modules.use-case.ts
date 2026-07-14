import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyCourseModuleRepository } from '../../ports/academy-course-module.repository';
import {
  ChapterNotFoundError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { assertSameIdSet } from '../../reorder-validation';
import { ReorderCourseModulesCommand } from './reorder-course-modules.command';

@Injectable()
export class ReorderCourseModulesUseCase {
  private readonly logger = new Logger(ReorderCourseModulesUseCase.name);

  constructor(
    private readonly chapterRepository: AcademyChapterRepository,
    private readonly courseModuleRepository: AcademyCourseModuleRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(command: ReorderCourseModulesCommand): Promise<void> {
    this.logger.log('Reordering academy modules', {
      chapterId: command.chapterId,
      count: command.courseModuleIds.length,
    });
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
  }
}
