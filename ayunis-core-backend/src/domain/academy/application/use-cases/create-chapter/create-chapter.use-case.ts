import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyChapter } from '../../../domain/academy-chapter.entity';
import { UnexpectedAcademyError } from '../../academy.errors';
import { CreateChapterCommand } from './create-chapter.command';

@Injectable()
export class CreateChapterUseCase {
  private readonly logger = new Logger(CreateChapterUseCase.name);

  constructor(private readonly chapterRepository: AcademyChapterRepository) {}

  async execute(command: CreateChapterCommand): Promise<AcademyChapter> {
    this.logger.log('Creating academy chapter', { title: command.title });
    try {
      const maxPosition = await this.chapterRepository.findMaxPosition();
      const chapter = new AcademyChapter({
        title: command.title,
        description: command.description,
        position: (maxPosition ?? -1) + 1,
      });
      return await this.chapterRepository.create(chapter);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error creating academy chapter', {
        error: error as Error,
      });
      throw new UnexpectedAcademyError(error);
    }
  }
}
