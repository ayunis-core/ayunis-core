import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { ApiKeysRepository } from '../../ports/api-keys.repository';
import { RevokeApiKeyCommand } from './revoke-api-key.command';
import {
  ApiKeyNotFoundError,
  UnexpectedApiKeyError,
} from '../../api-keys.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class RevokeApiKeyUseCase {
  private readonly logger = new Logger(RevokeApiKeyUseCase.name);

  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedApiKeyError)
  async execute(command: RevokeApiKeyCommand): Promise<void> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('execute', { apiKeyId: command.apiKeyId, orgId });

    const apiKey = await this.apiKeysRepository.findById(command.apiKeyId);

    // Surface "not found" for both the truly-missing case and the cross-org
    // case so callers cannot enumerate API key IDs across organizations by
    // observing 403 vs 404. Cross-org attempts are still logged.
    if (!apiKey) {
      throw new ApiKeyNotFoundError(command.apiKeyId);
    }

    if (apiKey.orgId !== orgId) {
      this.logger.warn('Cross-org API key revoke attempt', {
        apiKeyId: command.apiKeyId,
        keyOrgId: apiKey.orgId,
        callerOrgId: orgId,
      });
      throw new ApiKeyNotFoundError(command.apiKeyId);
    }

    await this.apiKeysRepository.revoke(command.apiKeyId);

    this.logger.debug('API key revoked', { apiKeyId: command.apiKeyId });
  }
}
