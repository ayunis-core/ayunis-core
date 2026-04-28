import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-strategy';
import type { Request } from 'express';

import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ActiveApiKey } from 'src/iam/authentication/domain/active-api-key.entity';

import { ApiKey } from '../../domain/api-key.entity';
import { ApiKeyError } from '../api-keys.errors';
import { ValidateApiKeyUseCase } from '../use-cases/validate-api-key/validate-api-key.use-case';
import { ValidateApiKeyCommand } from '../use-cases/validate-api-key/validate-api-key.command';

export const API_KEY_STRATEGY_NAME = 'api-key';
const BEARER_PREFIX = 'Bearer ';

/**
 * Bearer-token Passport strategy for Ayunis API keys.
 *
 * Composed alongside the JWT strategy in the global auth guard via
 * `AuthGuard(['jwt', 'api-key'])`. On success, Passport assigns the returned
 * `ActiveApiKey` to `request.user`, so downstream guards consume a single
 * unified `ActivePrincipal` regardless of credential type.
 *
 * Failure modes:
 * - No `Authorization: Bearer <ayu_...>` header: `fail()` with no challenge,
 *   letting Passport try the next strategy in the chain (JWT cookie auth).
 * - Bearer token present but invalid/expired: `fail()` with a 401 challenge,
 *   so the final response carries the API-key error message.
 * - Unexpected error (e.g. DB outage): `error()` so the request rejects with
 *   a 500-like Unauthorized rather than masquerading as a credential mismatch.
 */
@Injectable()
export class ApiKeyStrategy extends PassportStrategy(
  Strategy,
  API_KEY_STRATEGY_NAME,
) {
  private readonly logger = new Logger(ApiKeyStrategy.name);

  constructor(private readonly validateApiKeyUseCase: ValidateApiKeyUseCase) {
    super();
  }

  authenticate(request: Request): void {
    const token = this.extractBearerToken(request);
    if (token === null) {
      this.fail(401);
      return;
    }

    void this.validate(token)
      .then((principal) => this.success(principal))
      .catch((error: unknown) => this.handleError(error));
  }

  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith(BEARER_PREFIX)) {
      return null;
    }
    const token = header.slice(BEARER_PREFIX.length).trim();
    if (!token.startsWith(ApiKey.KEY_PREFIX)) {
      return null;
    }
    return token;
  }

  // Implements the abstract `validate()` contract from the @nestjs/passport
  // mixin. Not invoked via the standard verify-callback flow (we call it from
  // `authenticate()` ourselves), but exposing it here keeps the strategy
  // testable in isolation and satisfies the mixin's type requirement.
  async validate(token: string): Promise<ActiveApiKey> {
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
  }

  private handleError(error: unknown): void {
    if (error instanceof ApiKeyError) {
      this.fail(error.message, 401);
      return;
    }
    this.logger.error('Unexpected error during API key validation', error);
    this.error(new UnauthorizedException('API key authentication failed'));
  }
}
