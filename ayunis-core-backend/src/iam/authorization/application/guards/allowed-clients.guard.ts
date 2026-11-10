import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { SessionClient } from 'src/iam/sessions/domain/value-objects/session-client';
import type { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { buildAccessDeniedAuditContext } from 'src/common/util/access-denied-audit.util';
import { ALLOWED_CLIENTS_KEY } from 'src/iam/authorization/application/decorators/allowed-clients.decorator';
import { ClientNotAllowedError } from 'src/iam/authorization/application/authorization.errors';

/**
 * Default deny for token clients: a session bound to a client may only
 * call routes marked `@AllowedClients(<client>)`. Browser sessions and API
 * keys carry no client and pass untouched.
 */
@Injectable()
export class AllowedClientsGuard implements CanActivate {
  private readonly logger = new Logger(AllowedClientsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as ActiveUser | undefined;
    if (!user?.client) {
      return true;
    }

    const allowedClients = this.reflector.getAllAndOverride<
      SessionClient[] | undefined
    >(ALLOWED_CLIENTS_KEY, [context.getHandler(), context.getClass()]);
    if (allowedClients?.includes(user.client)) {
      return true;
    }

    this.logger.warn(
      { ...buildAccessDeniedAuditContext(request, user), client: user.client },
      'Access denied: route not allowed for session client',
    );
    throw new ClientNotAllowedError();
  }
}
