import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { LetterheadsRepository } from '../../ports/letterheads-repository.port';
import { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';
import {
  LetterheadNotFoundError,
  UnexpectedLetterheadError,
} from '../../letterheads.errors';
import { FindLetterheadQuery } from './find-letterhead.query';

@Injectable()
export class FindLetterheadUseCase {
  constructor(
    @InjectPinoLogger(FindLetterheadUseCase.name)
    private readonly logger: PinoLogger,
    private readonly letterheadsRepository: LetterheadsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindLetterheadQuery): Promise<Letterhead> {
    this.logger.info(
      {
        letterheadId: query.letterheadId,
      },
      'Finding letterhead',
    );

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedAccessError();
      }

      const letterhead = await this.letterheadsRepository.findById(
        orgId,
        query.letterheadId,
      );

      if (!letterhead) {
        throw new LetterheadNotFoundError(query.letterheadId);
      }

      return letterhead;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error({ err: error as Error }, 'Error finding letterhead');
      throw new UnexpectedLetterheadError('Error finding letterhead', {
        error: error as Error,
      });
    }
  }
}
