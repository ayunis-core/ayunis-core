import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Request } from 'express';
import * as Sentry from '@sentry/nestjs';
import { ContextService } from 'src/common/context/services/context.service';
import { getPrincipal } from '../../domain/get-principal';

/**
 * Reads the authenticated principal from `request.user` (populated by either
 * the JWT or API-key Passport strategy) and writes principal-aware values to
 * `ContextService` so downstream use cases can consume them.
 *
 * For user principals, `userId` is set and `apiKeyId` is left unset (and vice
 * versa) — this preserves existing FK semantics for code that joins
 * `context.userId` against the `users` table.
 */
@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  constructor(private readonly contextService: ContextService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request>();
    const principal = getPrincipal(request);

    if (!principal) {
      return next.handle();
    }

    if (principal.kind === 'user') {
      this.contextService.set('principalKind', 'user');
      this.contextService.set('userId', principal.id);
      this.contextService.set('orgId', principal.orgId);
      this.contextService.set('role', principal.role);
      this.contextService.set('systemRole', principal.systemRole);

      Sentry.getCurrentScope().setUser({
        id: principal.id,
        orgId: principal.orgId,
        role: principal.role,
        principalKind: 'user',
      });
    } else {
      this.contextService.set('principalKind', 'apiKey');
      this.contextService.set('apiKeyId', principal.apiKeyId);
      this.contextService.set('orgId', principal.orgId);
      this.contextService.set('role', principal.role);
      this.contextService.set('systemRole', principal.systemRole);

      Sentry.getCurrentScope().setUser({
        id: principal.apiKeyId,
        orgId: principal.orgId,
        role: principal.role,
        principalKind: 'apiKey',
      });
    }

    return next.handle();
  }
}
