import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from 'src/domain/academy/application/ports/academy-chapter.repository';
import { AcademyChapter } from 'src/domain/academy/domain/academy-chapter.entity';
import { UnexpectedAcademyError } from 'src/domain/academy/application/academy.errors';
import { CreateChapterCommand } from './create-chapter.command';

@Injectable()
export class CreateChapterUseCase {
  private readonly logger = new Logger(CreateChapterUseCase.name);

  constructor(private readonly chapterRepository: AcademyChapterRepository) {}

  async execute(command: CreateChapterCommand): Promise<AcademyChapter> {
    this.logger.log({ title: command.title }, 'Creating academy chapter');
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
      this.logger.error(
        {
          err: error as Error,
        },
        'Error creating academy chapter',
      );
      throw new UnexpectedAcademyError(error);
    }
  }
}
