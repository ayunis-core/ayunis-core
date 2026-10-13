import type { Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { RunExecutionFailedError } from 'src/domain/runs/application/runs.errors';

export function toRunError(error: unknown, logger: Logger): ApplicationError {
  if (error instanceof ApplicationError) return error;
  logger.error({ err: error as Error }, 'Runtime run failed');
  return new RunExecutionFailedError(
    error instanceof Error ? error.message : 'Unknown error',
    { originalError: error as Error },
  );
}
