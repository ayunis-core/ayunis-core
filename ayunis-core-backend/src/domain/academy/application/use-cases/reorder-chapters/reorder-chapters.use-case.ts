import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import { assertSameIdSet } from '../../reorder-validation';
import { ReorderChaptersCommand } from './reorder-chapters.command';

@Injectable()
export class ReorderChaptersUseCase {
  private readonly logger = new Logger(ReorderChaptersUseCase.name);

  constructor(private readonly chapterRepository: AcademyChapterRepository) {}

  async execute(command: ReorderChaptersCommand): Promise<void> {
    this.logger.log('Reordering academy chapters', {
      count: command.chapterIds.length,
    });
    try {
      const currentIds = await this.chapterRepository.findAllIds();
      assertSameIdSet(currentIds, command.chapterIds);
      await this.chapterRepository.updatePositions(command.chapterIds);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error reordering academy chapters', {
        error: error as Error,
      });
      throw new UnexpectedAcademyError(error);
    }
  }
}
