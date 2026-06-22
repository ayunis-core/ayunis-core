import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import { UnexpectedCreditLimitError } from '../../credit-limits.errors';

@Injectable()
export class ListCreditLimitsUseCase {
  private readonly logger = new Logger(ListCreditLimitsUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<CreditLimit[]> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('Listing credit limits', { orgId });

    try {
      return await this.creditLimitRepository.findByOrg(orgId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to list credit limits', {
        error: error as Error,
      });
      throw new UnexpectedCreditLimitError(error);
    }
  }
}
