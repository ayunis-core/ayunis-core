import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { UnexpectedAcademyError } from '../../academy.errors';
import { DeleteChapterCommand } from './delete-chapter.command';

@Injectable()
export class DeleteChapterUseCase {
  private readonly logger = new Logger(DeleteChapterUseCase.name);

  constructor(private readonly chapterRepository: AcademyChapterRepository) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(command: DeleteChapterCommand): Promise<void> {
    this.logger.log('Deleting academy chapter', {
      chapterId: command.chapterId,
    });
    await this.chapterRepository.delete(command.chapterId);
  }
}
