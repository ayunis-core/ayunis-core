import { HttpException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ApplicationError } from '../errors/base.error';
import { createPinoLoggerConfig } from '../logger/pino-logger.config';

type UnexpectedErrorClass = new (error: Error) => ApplicationError;

// Expected errors pass through unchanged, anything else is logged and
// wrapped in the module's Unexpected*Error.
export function HandleUnexpectedErrors(UnexpectedError: UnexpectedErrorClass) {
  return function <Args extends unknown[], Result>(
    target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<(...args: Args) => Promise<Result>>,
  ): void {
    const execute = descriptor.value;
    if (!execute) {
      return;
    }

    const logger = createDecoratorLogger(target.constructor.name);

    descriptor.value = async function (
      this: unknown,
      ...args: Args
    ): Promise<Result> {
      try {
        return await execute.apply(this, args);
      } catch (cause: unknown) {
        if (isExpectedError(cause)) {
          throw cause;
        }

        const error = toError(cause);
        logger.error({ err: error }, 'Unexpected use-case error');
        throw new UnexpectedError(error);
      }
    };
  };
}

// HttpException is transitional — remove once no use case throws it anymore.
function isExpectedError(
  error: unknown,
): error is ApplicationError | HttpException {
  return error instanceof ApplicationError || error instanceof HttpException;
}

function createDecoratorLogger(context: string): PinoLogger {
  const logger = new PinoLogger(createPinoLoggerConfig());
  logger.setContext(context);
  return logger;
}

function toError(cause: unknown): Error {
  if (cause instanceof Error) {
    return cause;
  }

  if (typeof cause === 'string') {
    return new Error(cause);
  }

  return new Error('Unknown error', { cause });
}
