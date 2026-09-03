import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedCreditLimitError } from 'src/iam/credit-limits/application/credit-limits.errors';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import { RemoveApiKeyCreditLimitCommand } from './remove-api-key-credit-limit.command';

@Injectable()
export class RemoveApiKeyCreditLimitUseCase {
  private readonly logger = new Logger(RemoveApiKeyCreditLimitUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(command: RemoveApiKeyCreditLimitCommand): Promise<void> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log(
      { orgId, apiKeyId: command.apiKeyId },
      'Removing API key credit limit',
    );
    await this.creditLimitRepository.deleteByApiKeyId(orgId, command.apiKeyId);
  }
}
