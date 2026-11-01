import { createHash, timingSafeEqual } from 'node:crypto';
import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class CoreConnectAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>('coreConnect.serviceToken');
    const { authorization } = context
      .switchToHttp()
      .getRequest<Request>().headers;
    const supplied = authorization?.match(/^Bearer ([^\s,]+)$/i)?.[1];

    if (!expected?.trim() || !supplied) {
      throw new UnauthorizedException();
    }

    // Fixed-length digests allow constant-time comparison for tokens of any length.
    const expectedHash = createHash('sha256').update(expected).digest();
    const suppliedHash = createHash('sha256').update(supplied).digest();
    if (!timingSafeEqual(expectedHash, suppliedHash)) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
