import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  private readonly logger = new Logger(LocalAuthGuard.name);

  constructor() {
    super();
  }

  canActivate(context: ExecutionContext) {
    this.logger.debug('LocalAuthGuard canActivate');
    return super.canActivate(context);
  }
}
