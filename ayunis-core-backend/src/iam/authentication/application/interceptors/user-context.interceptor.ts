import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request } from 'express';
import { ContextService } from 'src/common/context/services/context.service';
import { ActiveUser } from '../../domain/active-user.entity';

@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  constructor(private readonly contextService: ContextService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as ActiveUser | undefined;

    if (user) {
      this.contextService.set('userId', user.id);
      this.contextService.set('orgId', user.orgId);
      this.contextService.set('role', user.role);
      this.contextService.set('systemRole', user.systemRole);
    }

    return next.handle();
  }
}
