import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

@Injectable()
export class CookieParserMiddleware implements NestMiddleware {
  private cookieParserMiddleware: RequestHandler;

  constructor(
    @InjectPinoLogger(CookieParserMiddleware.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {
    const cookieSecret = this.configService.get<string>('auth.cookie.secret');

    if (!cookieSecret) {
      this.logger.warn(
        'Initializing cookie parser without signing (no COOKIE_SECRET)',
      );
      this.cookieParserMiddleware = cookieParser();
    } else {
      this.logger.info('Initializing cookie parser with signing');
      this.cookieParserMiddleware = cookieParser(cookieSecret);
    }
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    await this.cookieParserMiddleware(req, res, next);
  }
}
