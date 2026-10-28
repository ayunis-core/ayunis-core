import { ApplicationError } from 'src/common/errors/base.error';

export class ServiceUnavailableError extends ApplicationError {
  constructor(cause: Error) {
    super('Service temporarily unavailable', 'SERVICE_UNAVAILABLE', 503);
    this.cause = cause;
  }
}
