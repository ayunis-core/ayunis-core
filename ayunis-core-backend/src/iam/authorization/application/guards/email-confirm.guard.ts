import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { getPrincipal } from 'src/iam/authentication/application/util/get-principal';
import { EmailNotVerifiedError } from '../authorization.errors';
import { IS_PUBLIC_KEY } from 'src/common/guards/public.guard';
import { Reflector } from '@nestjs/core';

@Injectable()
export class EmailConfirmGuard implements CanActivate {
  private readonly logger = new Logger(EmailConfirmGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const principal = getPrincipal(request);
    if (!principal) {
      this.logger.warn('No authenticated principal in request context');
      return false;
    }

    // API-key principals don't carry an email — the email-verified gate
    // doesn't apply to them. Allow through.
    if (principal.kind !== 'user') {
      return true;
    }

    if (!principal.emailVerified) {
      this.logger.warn('User email not verified');
      throw new EmailNotVerifiedError();
    }

    return true;
  }
}
