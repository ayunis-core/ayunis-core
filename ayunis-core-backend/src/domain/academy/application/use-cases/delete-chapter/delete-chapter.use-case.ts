import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import { DeleteChapterCommand } from './delete-chapter.command';

@Injectable()
export class DeleteChapterUseCase {
  constructor(
    @InjectPinoLogger(DeleteChapterUseCase.name)
    private readonly logger: PinoLogger,
    private readonly chapterRepository: AcademyChapterRepository,
  ) {}

  async execute(command: DeleteChapterCommand): Promise<void> {
    this.logger.info(
      {
        chapterId: command.chapterId,
      },
      'Deleting academy chapter',
    );
    try {
      await this.chapterRepository.delete(command.chapterId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error deleting academy chapter',
      );
      throw new UnexpectedAcademyError(error);
    }
  }
}
