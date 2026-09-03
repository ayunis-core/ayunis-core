import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from 'src/domain/academy/application/ports/academy-chapter.repository';
import { AcademyChapter } from 'src/domain/academy/domain/academy-chapter.entity';
import { UnexpectedAcademyError } from 'src/domain/academy/application/academy.errors';
import { GetAcademyContentQuery } from './get-academy-content.query';

@Injectable()
export class GetAcademyContentUseCase {
  private readonly logger = new Logger(GetAcademyContentUseCase.name);

  constructor(private readonly chapterRepository: AcademyChapterRepository) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_query: GetAcademyContentQuery): Promise<AcademyChapter[]> {
    this.logger.log('Getting academy content');
    try {
      return await this.chapterRepository.findAllWithCourseModules();
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error getting academy content',
      );
      throw new UnexpectedAcademyError(error);
    }
  }
}
