import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { LetterheadsRepository } from '../../ports/letterheads-repository.port';
import { UnexpectedLetterheadError } from '../../letterheads.errors';
import { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';

@Injectable()
export class FindAllLetterheadsUseCase {
  constructor(
    @InjectPinoLogger(FindAllLetterheadsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly letterheadsRepository: LetterheadsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<Letterhead[]> {
    this.logger.info('Finding all letterheads');

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedAccessError();
      }

      return await this.letterheadsRepository.findAllByOrgId(orgId);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        { err: error as Error },
        'Error finding all letterheads',
      );
      throw new UnexpectedLetterheadError('Error finding all letterheads', {
        error: error as Error,
      });
    }
  }
}
