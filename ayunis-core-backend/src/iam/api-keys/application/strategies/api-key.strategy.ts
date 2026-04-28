import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as BearerStrategy } from 'passport-http-bearer';

import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ActiveApiKey } from 'src/iam/authentication/domain/active-api-key.entity';

import { ApiKey } from '../../domain/api-key.entity';
import { ApiKeyError } from '../api-keys.errors';
import { ValidateApiKeyUseCase } from '../use-cases/validate-api-key/validate-api-key.use-case';
import { ValidateApiKeyCommand } from '../use-cases/validate-api-key/validate-api-key.command';

export const API_KEY_STRATEGY_NAME = 'api-key';

/**
 * RFC 6750 Bearer-token Passport strategy for Ayunis API keys.
 *
 * Composed alongside the JWT strategy in the global auth guard via
 * `AuthGuard(['jwt', 'api-key'])`. Passport assigns the `ActiveApiKey`
 * returned from `validate()` to `request.user`, so downstream guards consume
 * a single unified `ActivePrincipal` regardless of credential type.
 *
 * `validate()` return semantics (per `passport-http-bearer`):
 * - Throwing → strategy errors (500-class), Passport surfaces it.
 * - Returning `false` → strategy fails (401), the next strategy in the chain
 *   gets a turn, then `WWW-Authenticate: Bearer ...` is sent.
 * - Returning the principal → strategy succeeds.
 *
 * Tokens that don't carry the Ayunis API-key prefix yield `false` so that
 * non-Ayunis bearer tokens fall through cleanly to the JWT strategy.
 */
@Injectable()
export class ApiKeyStrategy extends PassportStrategy(
  BearerStrategy,
  API_KEY_STRATEGY_NAME,
) {
  private readonly logger = new Logger(ApiKeyStrategy.name);

  constructor(private readonly validateApiKeyUseCase: ValidateApiKeyUseCase) {
    super();
  }

  async validate(token: string): Promise<ActiveApiKey | false> {
    if (!token.startsWith(ApiKey.KEY_PREFIX)) {
      return false;
    }
    try {
      const apiKey = await this.validateApiKeyUseCase.execute(
        new ValidateApiKeyCommand(token),
      );
      return new ActiveApiKey({
        apiKeyId: apiKey.id,
        label: apiKey.name,
        orgId: apiKey.orgId,
        role: UserRole.USER,
        systemRole: SystemRole.CUSTOMER,
      });
    } catch (err) {
      if (err instanceof ApiKeyError && err.statusCode < 500) {
        return false;
      }
      this.logger.error('Unexpected error during API key validation', err);
      throw err;
    }
  }
}
