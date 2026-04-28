import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { IS_PUBLIC_KEY } from 'src/common/guards/public.guard';
import { setCookies } from 'src/common/util/cookie.util';
import { API_KEY_STRATEGY_NAME } from 'src/iam/api-keys/application/strategies/api-key.strategy';

import { RefreshTokenUseCase } from '../use-cases/refresh-token/refresh-token.use-case';
import { RefreshTokenCommand } from '../use-cases/refresh-token/refresh-token.command';

const JWT_STRATEGY_NAME = 'jwt';

/**
 * The single, global authentication guard.
 *
 * Composes two Passport strategies:
 * - `jwt`  — cookie-based JWT access token (with refresh-token fallback)
 * - `api-key` — `Authorization: Bearer ayu_...` for programmatic clients
 *
 * Whichever strategy succeeds populates `request.user` with an
 * `ActivePrincipal` (the union of `ActiveUser` and `ActiveApiKey`), so all
 * downstream guards consume a single principal regardless of credential type.
 *
 * Routes marked `@Public()` short-circuit before either strategy runs.
 */
@Injectable()
export class GlobalAuthGuard extends AuthGuard([
  JWT_STRATEGY_NAME,
  API_KEY_STRATEGY_NAME,
]) {
  private readonly logger = new Logger(GlobalAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    if (await this.runStrategies(context)) {
      return true;
    }
    return this.tryRefreshAndValidate(context);
  }

  private async runStrategies(context: ExecutionContext): Promise<boolean> {
    try {
      const result = await super.canActivate(context);
      return result === true;
    } catch {
      return false;
    }
  }

  private async tryRefreshAndValidate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const refreshTokenName = this.configService.get<string>(
      'auth.cookie.refreshTokenName',
      'refresh_token',
    );
    const refreshToken = request.cookies[refreshTokenName] as string;
    if (!refreshToken) {
      return false;
    }

    try {
      const newTokens = await this.refreshTokenUseCase.execute(
        new RefreshTokenCommand(refreshToken),
      );
      setCookies(response, newTokens, this.configService, true);
      const accessTokenName = this.configService.get<string>(
        'auth.cookie.accessTokenName',
        'access_token',
      );
      request.cookies[accessTokenName] = newTokens.access_token;
      return this.runStrategies(context);
    } catch (error) {
      this.logger.debug('GlobalAuthGuard: token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
