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
        courseModules: existing.courseModules,
        createdAt: existing.createdAt,
        updatedAt: new Date(),
      });
      const persisted = await this.chapterRepository.update(updated);
      return new AcademyChapter({
        id: persisted.id,
        title: persisted.title,
        description: persisted.description,
        position: persisted.position,
        courseModules: existing.courseModules,
        createdAt: persisted.createdAt,
        updatedAt: persisted.updatedAt,
      });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error updating academy chapter', {
        error: error as Error,
      });
      throw new UnexpectedAcademyError(error);
    }
  }
}
