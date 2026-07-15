import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyChapter } from '../../../domain/academy-chapter.entity';
import { UnexpectedAcademyError } from '../../academy.errors';
import { CreateChapterCommand } from './create-chapter.command';

@Injectable()
export class CreateChapterUseCase {
  private readonly logger = new Logger(CreateChapterUseCase.name);

  constructor(private readonly chapterRepository: AcademyChapterRepository) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(command: CreateChapterCommand): Promise<AcademyChapter> {
    this.logger.log('Creating academy chapter', { title: command.title });
    const maxPosition = await this.chapterRepository.findMaxPosition();
    const chapter = new AcademyChapter({
      title: command.title,
      description: command.description,
      position: (maxPosition ?? -1) + 1,
    });
    return this.chapterRepository.create(chapter);
  }
}
