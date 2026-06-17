import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request } from 'express';
import * as Sentry from '@sentry/nestjs';
import { ContextService } from 'src/common/context/services/context.service';
import { ActiveUser } from '../../domain/active-user.entity';
import type { ApiKeyPrincipal } from '../strategies/api-key.strategy';

type RequestPrincipal = ActiveUser | ApiKeyPrincipal;

@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  constructor(private readonly contextService: ContextService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request>();
    const principal = req.user as RequestPrincipal | undefined;

    if (principal instanceof ActiveUser) {
      this.contextService.set('userId', principal.id);
      this.contextService.set('orgId', principal.orgId);
      this.contextService.set('role', principal.role);
      this.contextService.set('systemRole', principal.systemRole);

      Sentry.getCurrentScope().setUser({
        id: principal.id,
        orgId: principal.orgId,
        role: principal.role,
      });
    } else if (principal && 'apiKeyId' in principal) {
      this.contextService.set('apiKeyId', principal.apiKeyId);
      this.contextService.set('orgId', principal.orgId);
    }

    return next.handle();
  }
}
