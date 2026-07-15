import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import { assertSameIdSet } from '../../reorder-validation';
import { ReorderChaptersCommand } from './reorder-chapters.command';

@Injectable()
export class ReorderChaptersUseCase {
  private readonly logger = new Logger(ReorderChaptersUseCase.name);

  constructor(private readonly chapterRepository: AcademyChapterRepository) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(command: ReorderChaptersCommand): Promise<void> {
    this.logger.log('Reordering academy chapters', {
      count: command.chapterIds.length,
    });
    const currentIds = await this.chapterRepository.findAllIds();
    assertSameIdSet(currentIds, command.chapterIds);
    await this.chapterRepository.updatePositions(command.chapterIds);
  }
}
