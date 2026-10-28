import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from 'src/domain/academy/application/ports/academy-chapter.repository';
import { UnexpectedAcademyError } from 'src/domain/academy/application/academy.errors';
import { assertSameIdSet } from 'src/domain/academy/application/util/reorder-validation';
import { ReorderChaptersCommand } from './reorder-chapters.command';

@Injectable()
export class ReorderChaptersUseCase {
  private readonly logger = new Logger(ReorderChaptersUseCase.name);

  constructor(private readonly chapterRepository: AcademyChapterRepository) {}

  async execute(command: ReorderChaptersCommand): Promise<void> {
    this.logger.log(
      {
        count: command.chapterIds.length,
      },
      'Reordering academy chapters',
    );
    try {
      const currentIds = await this.chapterRepository.findAllIds();
      assertSameIdSet(currentIds, command.chapterIds);
      await this.chapterRepository.updatePositions(command.chapterIds);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error reordering academy chapters',
      );
      throw new UnexpectedAcademyError(error);
    }
  }
}
