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
import '../types/request.augmentation';

/**
 * Reads the authenticated principal from the request (`req.user` for users
 * authenticated via JWT, or `req.apiKey` for API-key callers) and writes
 * principal-aware values to `ContextService` so use cases can read them.
 *
 * For user principals, `userId` is set and `apiKeyId` is left unset (and vice
 * versa) — this preserves existing FK semantics for code that joins
 * `context.userId` against the `users` table.
 */
@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  constructor(private readonly contextService: ContextService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as ActiveUser | undefined;
    const apiKey = req.apiKey;

    if (user) {
      this.contextService.set('principalKind', 'user');
      this.contextService.set('userId', user.id);
      this.contextService.set('orgId', user.orgId);
      this.contextService.set('role', user.role);
      this.contextService.set('systemRole', user.systemRole);

      Sentry.getCurrentScope().setUser({
        id: user.id,
        orgId: user.orgId,
        role: user.role,
        principalKind: 'user',
      });
    } else if (apiKey) {
      this.contextService.set('principalKind', 'apiKey');
      this.contextService.set('apiKeyId', apiKey.apiKeyId);
      this.contextService.set('orgId', apiKey.orgId);
      this.contextService.set('role', apiKey.role);
      this.contextService.set('systemRole', apiKey.systemRole);

      Sentry.getCurrentScope().setUser({
        id: apiKey.apiKeyId,
        orgId: apiKey.orgId,
        role: apiKey.role,
        principalKind: 'apiKey',
      });
    }

    return next.handle();
  }
}
