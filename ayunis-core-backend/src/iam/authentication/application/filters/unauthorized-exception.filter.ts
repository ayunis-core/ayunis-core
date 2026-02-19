import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoginUseCase } from '../use-cases/login/login.use-case';
import { LoginCommand } from '../use-cases/login/login.command';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { setCookies } from 'src/common/util/cookie.util';
import { UUID } from 'crypto';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { ActiveUser } from '../../domain/active-user.entity';

@Injectable()
@Catch(UnauthorizedException)
export class UnauthorizedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UnauthorizedExceptionFilter.name);

  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
  ) {}

  async catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    this.logger.debug('Handling 401 Unauthorized exception');

    try {
      const userId = this.extractUserId(request);
      if (!userId) {
        return this.respondUnauthorized(response, exception);
      }

      this.logger.debug('Generating refresh token for user', { userId });
      const user = await this.findUserByIdUseCase.execute(
        new FindUserByIdQuery(userId as UUID),
      );
      if (!user) {
        return this.respondUnauthorized(response, exception);
      }

      const tokens = await this.loginUseCase.execute(
        new LoginCommand(
          new ActiveUser({
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            role: user.role,
            systemRole: user.systemRole,
            orgId: user.orgId,
            name: user.name,
          }),
        ),
      );
      setCookies(response, tokens, this.configService, true); // Include refresh token

      return this.respondWithRefreshPrompt(response, exception);
    } catch (error: unknown) {
      this.logger.error('Error in UnauthorizedExceptionFilter', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.respondUnauthorized(response, exception, true);
    }
  }

  private extractUserId(request: Request): string | undefined {
    const user = request.user;
    if (user && typeof user === 'object' && 'id' in user) {
      return user.id as string;
    }

    const cookieName = this.configService.get<string>(
      'auth.cookie.refreshTokenName',
      'refresh_token',
    );
    const cookies = (request.cookies as Record<string, string>) || {};
    const token = cookies[cookieName];
    const decoded = this.decodeJwt(token);
    if (!token || !decoded?.sub) {
      return undefined;
    }

    return decoded.sub;
  }

  private decodeJwt(token: string): { sub: string } | null {
    const decoded: unknown = this.jwtService.decode(token);
    if (
      decoded &&
      typeof decoded === 'object' &&
      'sub' in decoded &&
      typeof (decoded as Record<string, unknown>).sub === 'string'
    ) {
      return { sub: (decoded as Record<string, unknown>).sub as string };
    }
    return null;
  }

  private respondWithRefreshPrompt(
    response: Response,
    exception: UnauthorizedException,
  ) {
    return response.status(HttpStatus.UNAUTHORIZED).json({
      message:
        'Authentication expired. Use refresh token to obtain new credentials.',
      error: exception.message,
      shouldRefresh: true,
    });
  }

  private respondUnauthorized(
    response: Response,
    exception: UnauthorizedException,
    shouldRedirectToLogin = true,
  ) {
    return response.status(HttpStatus.UNAUTHORIZED).json({
      message: 'Unauthorized',
      error: exception.message,
      shouldRefresh: false,
      shouldRedirectToLogin,
    });
  }
}
