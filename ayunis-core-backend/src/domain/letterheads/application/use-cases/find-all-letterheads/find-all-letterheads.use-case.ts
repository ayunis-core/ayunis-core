import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { LetterheadsRepository } from '../../ports/letterheads-repository.port';
import { UnexpectedLetterheadError } from '../../letterheads.errors';
import { Letterhead } from '../../../domain/letterhead.entity';

@Injectable()
export class FindAllLetterheadsUseCase {
  private readonly logger = new Logger(FindAllLetterheadsUseCase.name);

  constructor(
    private readonly letterheadsRepository: LetterheadsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<Letterhead[]> {
    this.logger.log('Finding all letterheads');

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
      this.logger.error('Error finding all letterheads', {
        error: error as Error,
      });
      throw new UnexpectedLetterheadError('Error finding all letterheads', {
        error: error as Error,
      });
    }
  }
}
