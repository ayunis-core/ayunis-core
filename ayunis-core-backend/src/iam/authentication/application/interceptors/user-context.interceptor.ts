import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Request } from 'express';

@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as
      | {
          id: string;
          orgId: string;
        }
      | undefined;

    if (user) {
      this.cls.set('userId', user.id);
      this.cls.set('orgId', user.orgId);
    }

    return next.handle();
  }
}
