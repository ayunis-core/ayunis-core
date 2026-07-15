import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Injectable()
@Catch(UnauthorizedException)
export class UnauthorizedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UnauthorizedExceptionFilter.name);

  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.debug('Handling 401 Unauthorized exception');

    // Transparent, cryptographically verified token refresh is handled upstream
    // by JwtAuthGuard. This filter only shapes the 401 response; it never issues
    // credentials. (It previously minted a session from an *unverified* decode
    // of the refresh cookie, which allowed forged-cookie account takeover.)
    return this.respondUnauthorized(response, exception);
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
