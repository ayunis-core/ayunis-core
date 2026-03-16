import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { LetterheadsRepository } from '../../ports/letterheads-repository.port';
import { Letterhead } from '../../../domain/letterhead.entity';

@Injectable()
export class FindAllLetterheadsUseCase {
  private readonly logger = new Logger(FindAllLetterheadsUseCase.name);

  constructor(
    private readonly letterheadsRepository: LetterheadsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<Letterhead[]> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('Finding all letterheads', { orgId });
    return this.letterheadsRepository.findAllByOrgId(orgId);
  }
}
