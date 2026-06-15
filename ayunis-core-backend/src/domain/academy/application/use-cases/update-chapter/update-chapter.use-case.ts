import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyChapter } from '../../../domain/academy-chapter.entity';
import {
  ChapterNotFoundError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { UpdateChapterCommand } from './update-chapter.command';

@Injectable()
export class UpdateChapterUseCase {
  private readonly logger = new Logger(UpdateChapterUseCase.name);

  constructor(private readonly chapterRepository: AcademyChapterRepository) {}

  async execute(command: UpdateChapterCommand): Promise<AcademyChapter> {
    this.logger.log('Updating academy chapter', {
      chapterId: command.chapterId,
    });
    try {
      const existing = await this.chapterRepository.findOne(command.chapterId);
      if (!existing) {
        throw new ChapterNotFoundError(command.chapterId);
      }
      const updated = new AcademyChapter({
        id: existing.id,
        title: command.title,
        description: command.description,
        position: existing.position,
        createdAt: existing.createdAt,
        updatedAt: new Date(),
      });
      return await this.chapterRepository.update(updated);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error updating academy chapter', {
        error: error as Error,
      });
      throw new UnexpectedAcademyError(error);
    }
  }
}
