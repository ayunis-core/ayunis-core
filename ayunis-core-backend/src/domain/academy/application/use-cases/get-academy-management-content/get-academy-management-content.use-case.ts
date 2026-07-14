import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyChapter } from '../../../domain/academy-chapter.entity';
import { UnexpectedAcademyError } from '../../academy.errors';
import { GetAcademyManagementContentQuery } from './get-academy-management-content.query';

/**
 * Super-admin-only read: returns chapters with their modules AND quiz
 * questions (including correct answers). The learner-facing
 * GetAcademyContentUseCase never loads quiz questions, so correct answers
 * cannot leak to learners.
 */
@Injectable()
export class GetAcademyManagementContentUseCase {
  private readonly logger = new Logger(GetAcademyManagementContentUseCase.name);

  constructor(private readonly chapterRepository: AcademyChapterRepository) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _query: GetAcademyManagementContentQuery,
  ): Promise<AcademyChapter[]> {
    this.logger.log('Getting academy management content');
    return this.chapterRepository.findAllWithQuizContent();
  }
}
