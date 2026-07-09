import { Logger } from '@nestjs/common';

export abstract class BaseUseCase {
  protected readonly logger = new Logger(this.constructor.name);
}
