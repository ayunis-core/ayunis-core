import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimitScope } from '../../../domain/value-objects/credit-limit-scope.enum';
import { UnexpectedCreditLimitError } from '../../credit-limits.errors';
import { RemoveCreditLimitCommand } from './remove-credit-limit.command';

@Injectable()
export class RemoveCreditLimitUseCase {
  private readonly logger = new Logger(RemoveCreditLimitUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: RemoveCreditLimitCommand): Promise<void> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('Removing credit limit', {
      orgId,
      scope: command.scope,
      targetId: command.targetId,
    });

    try {
      if (command.scope === CreditLimitScope.USER) {
        await this.creditLimitRepository.deleteByUserId(
          orgId,
          command.targetId,
        );
      } else {
        await this.creditLimitRepository.deleteByTeamId(
          orgId,
          command.targetId,
        );
      }
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to remove credit limit', {
        error: error as Error,
      });
      throw new UnexpectedCreditLimitError(error);
    }
  }
}
