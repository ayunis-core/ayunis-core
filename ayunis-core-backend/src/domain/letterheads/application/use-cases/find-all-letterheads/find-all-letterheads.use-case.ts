import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
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

  @HandleUnexpectedErrors(UnexpectedLetterheadError)
  async execute(): Promise<Letterhead[]> {
    this.logger.log('Finding all letterheads');

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    return await this.letterheadsRepository.findAllByOrgId(orgId);
  }
}
