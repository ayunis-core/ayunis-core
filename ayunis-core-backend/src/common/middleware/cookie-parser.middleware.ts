import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

@Injectable()
export class CookieParserMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CookieParserMiddleware.name);
  private cookieParserMiddleware: RequestHandler;

  constructor(private configService: ConfigService) {
    const cookieSecret = this.configService.get<string>('auth.cookie.secret');

    if (!cookieSecret) {
      this.logger.warn(
        'Initializing cookie parser without signing (no COOKIE_SECRET)',
      );
      this.cookieParserMiddleware = cookieParser();
    } else {
      this.logger.log('Initializing cookie parser with signing');
      this.cookieParserMiddleware = cookieParser(cookieSecret);
    }
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    await this.cookieParserMiddleware(req, res, next);
  }
}
