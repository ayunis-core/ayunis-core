import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from 'src/domain/academy/application/ports/academy-chapter.repository';
import { UnexpectedAcademyError } from 'src/domain/academy/application/academy.errors';
import { DeleteChapterCommand } from './delete-chapter.command';

@Injectable()
export class DeleteChapterUseCase {
  private readonly logger = new Logger(DeleteChapterUseCase.name);

  constructor(private readonly chapterRepository: AcademyChapterRepository) {}

  async execute(command: DeleteChapterCommand): Promise<void> {
    this.logger.log(
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
