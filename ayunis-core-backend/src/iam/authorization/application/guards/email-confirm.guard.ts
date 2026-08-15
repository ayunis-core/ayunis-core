import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { EmailNotVerifiedError } from '../authorization.errors';
import { IS_PUBLIC_KEY } from 'src/common/guards/public.guard';
import { Reflector } from '@nestjs/core';

@Injectable()
export class EmailConfirmGuard implements CanActivate {
  constructor(
    @InjectPinoLogger(EmailConfirmGuard.name)
    private readonly logger: PinoLogger,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const user = context
      .switchToHttp()
      .getRequest<{ user?: ActiveUser }>().user;
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
