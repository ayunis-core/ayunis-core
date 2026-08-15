import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApiKeysRepository } from '../../ports/api-keys.repository';
import { RevokeApiKeyCommand } from './revoke-api-key.command';
import {
  ApiKeyNotFoundError,
  UnexpectedApiKeyError,
} from '../../api-keys.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class RevokeApiKeyUseCase {
  constructor(
    @InjectPinoLogger(RevokeApiKeyUseCase.name)
    private readonly logger: PinoLogger,
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: RevokeApiKeyCommand): Promise<void> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.info({ apiKeyId: command.apiKeyId, orgId }, 'execute');

    try {
      const apiKey = await this.apiKeysRepository.findById(command.apiKeyId);

      // Surface "not found" for both the truly-missing case and the cross-org
      // case so callers cannot enumerate API key IDs across organizations by
      // observing 403 vs 404. Cross-org attempts are still logged.
      if (!apiKey) {
        throw new ApiKeyNotFoundError(command.apiKeyId);
      }

      if (apiKey.orgId !== orgId) {
        this.logger.warn(
          {
            apiKeyId: command.apiKeyId,
            keyOrgId: apiKey.orgId,
            callerOrgId: orgId,
          },
          'Cross-org API key revoke attempt',
        );
        throw new ApiKeyNotFoundError(command.apiKeyId);
      }

      await this.apiKeysRepository.revoke(command.apiKeyId);

      this.logger.debug({ apiKeyId: command.apiKeyId }, 'API key revoked');
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error({ err: error as Error }, 'Failed to revoke API key');
      throw new UnexpectedApiKeyError();
    }
  }
}
