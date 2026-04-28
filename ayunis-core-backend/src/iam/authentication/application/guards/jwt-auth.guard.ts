import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from 'src/common/guards/public.guard';
import { Request, Response } from 'express';
import { RefreshTokenUseCase } from '../use-cases/refresh-token/refresh-token.use-case';
import { RefreshTokenCommand } from '../use-cases/refresh-token/refresh-token.command';
import { ConfigService } from '@nestjs/config';
import { setCookies } from 'src/common/util/cookie.util';
import { ValidateApiKeyUseCase } from 'src/iam/api-keys/application/use-cases/validate-api-key/validate-api-key.use-case';
import { ValidateApiKeyCommand } from 'src/iam/api-keys/application/use-cases/validate-api-key/validate-api-key.command';
import { ApiKey } from 'src/iam/api-keys/domain/api-key.entity';
import { ApiKeyError } from 'src/iam/api-keys/application/api-keys.errors';
import { ActiveApiKey } from '../../domain/active-api-key.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

const BEARER_PREFIX = 'Bearer ';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private refreshTokenUseCase: RefreshTokenUseCase,
    private configService: ConfigService,
    private validateApiKeyUseCase: ValidateApiKeyUseCase,
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

    // API-key authentication path: if the Authorization header carries an
    // Ayunis API key, validate it here and populate `req.apiKey`. This keeps
    // every other global guard (subscription, IP allowlist, rate limit, etc.)
    // applicable to API-key callers — they don't get a `@Public()` bypass.
    if (await this.tryAuthenticateApiKey(context)) {
      return true;
    }

    // JWT path: try the access token first, then the refresh token.
    if (await this.tryAccessToken(context)) {
      return true;
    }
    return this.tryRefreshAndValidate(context);
  }

  private async tryAccessToken(context: ExecutionContext): Promise<boolean> {
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
      const result = await super.canActivate(context);
      return result === true;
    } catch (error) {
      this.logger.debug('JwtAuthGuard canActivate: token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private async tryAuthenticateApiKey(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    if (!header?.startsWith(BEARER_PREFIX)) {
      return false;
    }
    const token = header.slice(BEARER_PREFIX.length).trim();
    if (!token.startsWith(ApiKey.KEY_PREFIX)) {
      return false;
    }
    try {
      const apiKey = await this.validateApiKeyUseCase.execute(
        new ValidateApiKeyCommand(token),
      );
      request.apiKey = new ActiveApiKey({
        apiKeyId: apiKey.id,
        label: apiKey.name,
        orgId: apiKey.orgId,
        role: UserRole.USER,
        systemRole: SystemRole.CUSTOMER,
      });
      return true;
    } catch (error) {
      if (error instanceof ApiKeyError) {
        throw new UnauthorizedException(error.message);
      }
      this.logger.error('Unexpected error during API key validation', error);
      throw new UnauthorizedException('API key authentication failed');
    }
  }
}
