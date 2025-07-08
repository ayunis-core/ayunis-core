import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ADMIN_KEY } from '../decorators/admin.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isAdmin = this.reflector.getAllAndOverride<boolean>(ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isAdmin) {
      return true;
    }

    const request: Request = context.switchToHttp().getRequest();
    const adminToken = request.headers['x-admin-token'] as string;
    const expectedToken = this.configService.get<string>('admin.adminToken');

    if (!adminToken || adminToken !== expectedToken) {
      throw new UnauthorizedException(
        'Invalid admin token. Please provide a valid admin token in the x-admin-token header.',
      );
    }

    return true;
  }
}
