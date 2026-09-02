import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyChapter } from 'src/domain/academy/domain/academy-chapter.entity';
import {
  ChapterNotFoundError,
  UnexpectedAcademyError,
} from 'src/domain/academy/application/academy.errors';
import { AcademyChapterRepository } from 'src/domain/academy/application/ports/academy-chapter.repository';
import { UpdateChapterCommand } from './update-chapter.command';

@Injectable()
export class UpdateChapterUseCase {
  constructor(
    @InjectPinoLogger(UpdateChapterUseCase.name)
    private readonly logger: PinoLogger,
    private readonly chapterRepository: AcademyChapterRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(command: UpdateChapterCommand): Promise<AcademyChapter> {
    this.logger.info(
      { chapterId: command.chapterId },
      'Updating academy chapter',
    );
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
  }
}
