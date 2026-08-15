import { ExecutionContext, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  constructor(
    @InjectPinoLogger(LocalAuthGuard.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    this.logger.debug('LocalAuthGuard canActivate');
    return super.canActivate(context);
  }
}
