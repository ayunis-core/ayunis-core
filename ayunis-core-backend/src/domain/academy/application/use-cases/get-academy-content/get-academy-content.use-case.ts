import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyChapter } from '../../../domain/academy-chapter.entity';
import { UnexpectedAcademyError } from '../../academy.errors';
import { GetAcademyContentQuery } from './get-academy-content.query';

@Injectable()
export class GetAcademyContentUseCase {
  private readonly logger = new Logger(GetAcademyContentUseCase.name);

  constructor(private readonly chapterRepository: AcademyChapterRepository) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_query: GetAcademyContentQuery): Promise<AcademyChapter[]> {
    this.logger.log('Getting academy content');
    return this.chapterRepository.findAllWithCourseModules();
  }
}
