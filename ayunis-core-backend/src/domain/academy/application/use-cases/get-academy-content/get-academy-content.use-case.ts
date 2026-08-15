import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyChapter } from 'src/domain/academy/domain/academy-chapter.entity';
import { UnexpectedAcademyError } from '../../academy.errors';
import { GetAcademyContentQuery } from './get-academy-content.query';

@Injectable()
export class GetAcademyContentUseCase {
  constructor(
    @InjectPinoLogger(GetAcademyContentUseCase.name)
    private readonly logger: PinoLogger,
    private readonly chapterRepository: AcademyChapterRepository,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_query: GetAcademyContentQuery): Promise<AcademyChapter[]> {
    this.logger.info('Getting academy content');
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
