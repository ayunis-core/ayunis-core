import { AssertCachedOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-cached-org-active/assert-cached-org-active.use-case';
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import type { UUID } from 'crypto';
import type { Request } from 'express';
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

const BEARER_HEADER = /^Bearer (\S+)$/i;

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  private readonly logger = new Logger(ApiKeyStrategy.name);

  constructor(
    private readonly validateApiKey: ValidateApiKeyUseCase,
    private readonly assertOrgActive: AssertCachedOrgActiveUseCase,
  ) {
    super();
  }

  // Header only: passport-http-bearer also read `?access_token=` and
  // `body.access_token`, which leaks keys into URLs and access logs.
  async validate(req: Request): Promise<ApiKeyPrincipal | false> {
    const token = BEARER_HEADER.exec(req.headers.authorization ?? '')?.[1];
    if (!token) return false;
    try {
      const apiKey = await this.validateApiKey.execute(
        new ValidateApiKeyCommand(token),
      );
      await this.assertOrgActive.execute({ orgId: apiKey.orgId });
      return { apiKeyId: apiKey.id, orgId: apiKey.orgId };
    } catch (error) {
      if (
        error instanceof ApiKeyNotFoundError ||
        error instanceof ApiKeyExpiredError
      ) {
        this.logger.debug({ code: error.code }, 'API key validation failed');
        return false;
      }
      throw error;
    }
  }
}
