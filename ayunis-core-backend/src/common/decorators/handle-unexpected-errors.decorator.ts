import { HttpException, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { isDatabaseUnavailableError } from 'src/common/errors/database-unavailable-error.classifier';
import { ServiceUnavailableError } from 'src/common/errors/service-unavailable.error';

type UnexpectedErrorClass = new (error: Error) => ApplicationError;

interface UnexpectedErrorOptions {
  // Opt in only at boundaries where unclassified connection failures are
  // known to originate from persistence, not from another network service.
  databaseUnavailable?: true | 'includingExpectedErrors';
}

// Expected errors pass through unchanged, anything else is logged and
// wrapped in the module's Unexpected*Error. With databaseUnavailable, a
// database outage becomes ServiceUnavailableError instead; under
// 'includingExpectedErrors' that also applies to an outage nested inside an
// expected error.
export function HandleUnexpectedErrors(
  UnexpectedError: UnexpectedErrorClass,
  options: UnexpectedErrorOptions = {},
) {
  return function <Args extends unknown[], Result>(
    target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<(...args: Args) => Promise<Result>>,
  ): void {
    const execute = descriptor.value;
    if (!execute) {
      return;
    }

    const logger = new Logger(target.constructor.name);

    descriptor.value = async function (
      this: unknown,
      ...args: Args
    ): Promise<Result> {
      try {
        return await execute.apply(this, args);
      } catch (cause: unknown) {
        if (cause instanceof ServiceUnavailableError) {
          throw cause;
        }
        const isBoundaryUnexpectedError = cause instanceof UnexpectedError;
        const inspectExpectedError =
          isBoundaryUnexpectedError ||
          options.databaseUnavailable === 'includingExpectedErrors';
        if (isExpectedError(cause) && !inspectExpectedError) {
          throw cause;
        }
        if (options.databaseUnavailable && isDatabaseUnavailableError(cause)) {
          const error = toError(cause);
          if (!isBoundaryUnexpectedError) {
            logger.error({ err: error }, 'Unexpected use-case error');
          }
          throw new ServiceUnavailableError(error);
        }
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

function toError(cause: unknown): Error {
  if (cause instanceof Error) {
    return cause;
  }

  if (typeof cause === 'string') {
    return new Error(cause);
  }

  return new Error('Unknown error', { cause });
}
