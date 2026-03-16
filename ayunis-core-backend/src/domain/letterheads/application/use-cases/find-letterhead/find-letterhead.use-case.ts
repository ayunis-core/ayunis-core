import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { LetterheadsRepository } from '../../ports/letterheads-repository.port';
import { Letterhead } from '../../../domain/letterhead.entity';
import { LetterheadNotFoundError } from '../../letterheads.errors';
import { FindLetterheadQuery } from './find-letterhead.query';

@Injectable()
export class FindLetterheadUseCase {
  private readonly logger = new Logger(FindLetterheadUseCase.name);

  constructor(
    private readonly letterheadsRepository: LetterheadsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindLetterheadQuery): Promise<Letterhead> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('Finding letterhead', {
      letterheadId: query.letterheadId,
    });

    const letterhead = await this.letterheadsRepository.findById(
      orgId,
      query.letterheadId,
    );

    if (!letterhead) {
      throw new LetterheadNotFoundError(query.letterheadId);
    }

    return letterhead;
  }
}
