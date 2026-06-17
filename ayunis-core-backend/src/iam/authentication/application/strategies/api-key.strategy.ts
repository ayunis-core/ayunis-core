import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import type { UUID } from 'crypto';
import {
  ApiKeyExpiredError,
  ApiKeyNotFoundError,
} from 'src/iam/api-keys/application/api-keys.errors';
import { ValidateApiKeyUseCase } from 'src/iam/api-keys/application/use-cases/validate-api-key/validate-api-key.use-case';
import { ValidateApiKeyCommand } from 'src/iam/api-keys/application/use-cases/validate-api-key/validate-api-key.command';

// Internal shape only — intentionally not exported as a domain type so it
// doesn't re-introduce ActivePrincipal-style abstractions.
export interface ApiKeyPrincipal {
  apiKeyId: UUID;
  orgId: UUID;
}

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  private readonly logger = new Logger(ApiKeyStrategy.name);

  constructor(private readonly validateApiKey: ValidateApiKeyUseCase) {
    super();
  }

  async validate(token: string): Promise<ApiKeyPrincipal | false> {
    try {
      const apiKey = await this.validateApiKey.execute(
        new ValidateApiKeyCommand(token),
      );
      return { apiKeyId: apiKey.id, orgId: apiKey.orgId };
    } catch (error) {
      if (
        error instanceof ApiKeyNotFoundError ||
        error instanceof ApiKeyExpiredError
      ) {
        this.logger.debug('API key validation failed', { code: error.code });
        return false;
      }
      throw error;
    }
  }
}
