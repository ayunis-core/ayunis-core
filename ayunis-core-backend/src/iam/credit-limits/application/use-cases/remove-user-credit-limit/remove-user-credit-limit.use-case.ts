import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import { UnexpectedCreditLimitError } from 'src/iam/credit-limits/application/credit-limits.errors';
import { RemoveUserCreditLimitCommand } from './remove-user-credit-limit.command';

@Injectable()
export class RemoveUserCreditLimitUseCase {
  private readonly logger = new Logger(RemoveUserCreditLimitUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: RemoveUserCreditLimitCommand): Promise<void> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log(
      {
        orgId,
        userId: command.userId,
      },
      'Removing user credit limit',
    );

    try {
      await this.creditLimitRepository.deleteByUserId(orgId, command.userId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error },
        'Failed to remove user credit limit',
      );
      throw new UnexpectedCreditLimitError(error);
    }
  }
}
