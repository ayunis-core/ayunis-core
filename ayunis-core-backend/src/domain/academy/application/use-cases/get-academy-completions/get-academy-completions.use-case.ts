import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcademyCompletionRepository } from 'src/domain/academy/application/ports/academy-completion.repository';
import { UnexpectedAcademyError } from 'src/domain/academy/application/academy.errors';
import type { AcademyCompletionView } from 'src/domain/academy/domain/academy-completion-view';
import { toAcademyCompletionView } from 'src/domain/academy/application/util/academy-completion-view';
import { GetAcademyCompletionsQuery } from './get-academy-completions.query';

/**
 * The many-user counterpart of `GetAcademyCompletionUseCase`, for admin
 * overviews that would otherwise fire one query per member. Users who never
 * completed the academy are simply absent from the map — callers decide what
 * "never passed" reads as in their context.
 */
@Injectable()
export class GetAcademyCompletionsUseCase {
  constructor(
    @InjectPinoLogger(GetAcademyCompletionsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly completionRepository: AcademyCompletionRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(
    query: GetAcademyCompletionsQuery,
  ): Promise<ReadonlyMap<UUID, AcademyCompletionView>> {
    this.logger.debug(
      {
        userCount: query.userIds.length,
      },
      'Getting academy completions',
    );

    const completions = await this.completionRepository.findByUsers(
      query.userIds,
    );

    return new Map(
      completions.map((completion) => [
        completion.userId,
        toAcademyCompletionView(completion),
      ]),
    );
  }
}
