import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyChapter } from 'src/domain/academy/domain/academy-chapter.entity';
import { UnexpectedAcademyError } from 'src/domain/academy/application/academy.errors';
import { AcademyChapterRepository } from 'src/domain/academy/application/ports/academy-chapter.repository';
import { GetAcademyManagementContentQuery } from './get-academy-management-content.query';

@Injectable()
export class GetAcademyManagementContentUseCase {
  constructor(
    @InjectPinoLogger(GetAcademyManagementContentUseCase.name)
    private readonly logger: PinoLogger,
    private readonly chapterRepository: AcademyChapterRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _query: GetAcademyManagementContentQuery,
  ): Promise<AcademyChapter[]> {
    this.logger.info('Getting academy management content');
    return this.chapterRepository.findAllWithCourseModules();
  }
}
