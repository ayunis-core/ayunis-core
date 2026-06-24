import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import { DeleteChapterCommand } from './delete-chapter.command';

@Injectable()
export class DeleteChapterUseCase {
  private readonly logger = new Logger(DeleteChapterUseCase.name);

  constructor(private readonly chapterRepository: AcademyChapterRepository) {}

  async execute(command: DeleteChapterCommand): Promise<void> {
    this.logger.log('Deleting academy chapter', {
      chapterId: command.chapterId,
    });
    try {
      await this.chapterRepository.delete(command.chapterId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error deleting academy chapter', {
        error: error as Error,
      });
      throw new UnexpectedAcademyError(error);
    }
  }
}
