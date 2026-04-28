import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { EmailNotVerifiedError } from '../authorization.errors';
import { IS_PUBLIC_KEY } from 'src/common/guards/public.guard';
import { Reflector } from '@nestjs/core';

@Injectable()
export class EmailConfirmGuard implements CanActivate {
  private readonly logger = new Logger(EmailConfirmGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    // API-key principals don't carry an email — the email-verified gate
    // doesn't apply to them. Allow through.
    if (request.apiKey) {
      return true;
    }

    const user = request.user as ActiveUser | undefined;
    if (!user) {
      this.logger.warn('User not found in request context');
      return false;
    }

    if (!user.emailVerified) {
      this.logger.warn('User email not verified');
      throw new EmailNotVerifiedError();
    }

    return true;
  }
}
