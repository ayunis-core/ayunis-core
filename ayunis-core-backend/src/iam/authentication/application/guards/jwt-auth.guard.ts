import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from 'src/common/guards/public.guard';
import { Request, Response } from 'express';
import { RefreshTokenUseCase } from '../use-cases/refresh-token/refresh-token.use-case';
import { RefreshTokenCommand } from '../use-cases/refresh-token/refresh-token.command';
import { ConfigService } from '@nestjs/config';
import { setCookies } from 'src/common/util/cookie.util';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private refreshTokenUseCase: RefreshTokenUseCase,
    private configService: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Try normal JWT validation first
    try {
      const result = await super.canActivate(context);
      if (result) {
        return true;
      }
    } catch {
      // Access token validation failed, try refresh token
    }

    // Access token validation failed, try refresh token
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
      // Try to refresh the tokens
      const newTokens = await this.refreshTokenUseCase.execute(
        new RefreshTokenCommand(refreshToken),
      );

      // Set new cookies with refreshed tokens
      setCookies(response, newTokens, this.configService, true);

      // Manually set the new access token in the request for this request
      const accessTokenName = this.configService.get<string>(
        'auth.cookie.accessTokenName',
        'access_token',
      );
      request.cookies[accessTokenName] = newTokens.access_token;

      // Try JWT validation again with the new token
      const result = await super.canActivate(context);
      if (result) {
        return true;
      }
    } catch (error) {
      this.logger.debug('JwtAuthGuard canActivate: token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    this.logger.debug(
      'JwtAuthGuard canActivate: all authentication attempts failed',
    );
    return false;
  }
}
