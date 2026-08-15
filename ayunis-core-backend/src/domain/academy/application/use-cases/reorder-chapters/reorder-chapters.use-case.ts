import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import { assertSameIdSet } from '../../util/reorder-validation';
import { ReorderChaptersCommand } from './reorder-chapters.command';

@Injectable()
export class ReorderChaptersUseCase {
  constructor(
    @InjectPinoLogger(ReorderChaptersUseCase.name)
    private readonly logger: PinoLogger,
    private readonly chapterRepository: AcademyChapterRepository,
  ) {}

  async execute(command: ReorderChaptersCommand): Promise<void> {
    this.logger.info(
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
