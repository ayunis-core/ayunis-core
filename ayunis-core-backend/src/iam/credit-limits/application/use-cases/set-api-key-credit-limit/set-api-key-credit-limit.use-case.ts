import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { isNonNegativeFinite } from 'src/common/util/number.util';
import { ListApiKeysByOrgUseCase } from 'src/iam/api-keys/application/use-cases/list-api-keys-by-org/list-api-keys-by-org.use-case';
import {
  CreditLimitTargetNotFoundError,
  InvalidCreditLimitError,
  UnexpectedCreditLimitError,
} from 'src/iam/credit-limits/application/credit-limits.errors';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import { ApiKeyCreditLimit } from 'src/iam/credit-limits/domain/api-key-credit-limit.entity';
import { SetApiKeyCreditLimitCommand } from './set-api-key-credit-limit.command';

@Injectable()
export class SetApiKeyCreditLimitUseCase {
  private readonly logger = new Logger(SetApiKeyCreditLimitUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
    private readonly listApiKeysByOrgUseCase: ListApiKeysByOrgUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(
    command: SetApiKeyCreditLimitCommand,
  ): Promise<ApiKeyCreditLimit> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }
    if (!isNonNegativeFinite(command.monthlyCredits)) {
      throw new InvalidCreditLimitError(
        'monthlyCredits must be a number greater than or equal to 0',
        { monthlyCredits: command.monthlyCredits },
      );
    }

    this.logger.log(
      { orgId, apiKeyId: command.apiKeyId },
      'Setting API key credit limit',
    );

    const apiKeys = await this.listApiKeysByOrgUseCase.execute();
    if (!apiKeys.some((apiKey) => apiKey.id === command.apiKeyId)) {
      throw new CreditLimitTargetNotFoundError({ apiKeyId: command.apiKeyId });
    }

    const existing = await this.creditLimitRepository.findByApiKeyId(
      orgId,
      command.apiKeyId,
    );
    const limit = new ApiKeyCreditLimit({
      id: existing?.id,
      orgId,
      apiKeyId: command.apiKeyId,
      monthlyCredits: command.monthlyCredits,
      createdAt: existing?.createdAt,
    });

    return this.creditLimitRepository.save(limit);
  }
}
