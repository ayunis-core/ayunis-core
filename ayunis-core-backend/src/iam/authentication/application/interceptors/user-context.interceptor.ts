import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { setTag } from '@appsignal/nodejs';
import { ContextService } from 'src/common/context/services/context.service';
import { ActiveUser } from '../../domain/active-user.entity';
import type { ApiKeyPrincipal } from '../strategies/api-key.strategy';

type RequestPrincipal = ActiveUser | ApiKeyPrincipal;

@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  constructor(
    private readonly contextService: ContextService,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request>();
    const principal = req.user as RequestPrincipal | undefined;

    if (principal instanceof ActiveUser) {
      this.contextService.set('userId', principal.id);
      this.contextService.set('orgId', principal.orgId);
      this.contextService.set('role', principal.role);
      this.contextService.set('systemRole', principal.systemRole);
      this.contextService.set('refreshToken', this.extractRefreshToken(req));

      setTag('user_id', principal.id);
      setTag('org_id', principal.orgId);
      setTag('role', principal.role);
    } else if (principal && 'apiKeyId' in principal) {
      this.contextService.set('apiKeyId', principal.apiKeyId);
      this.contextService.set('orgId', principal.orgId);
    }

    return next.handle();
  }

  private extractRefreshToken(req: Request): string | undefined {
    const refreshTokenName = this.configService.get<string>(
      'auth.cookie.refreshTokenName',
      'refresh_token',
    );
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[refreshTokenName];
  }
}
