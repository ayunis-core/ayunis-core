import { ApplicationError } from 'src/common/errors/base.error';

export interface ProcessingContext {
  read(key: string): Promise<string | undefined>;
  /** Reject writes for inactive sources, including deletion during persistence. */
  write(key: string, value: string): Promise<void>;
  isActive(): Promise<boolean>;
  progress(completed: number): Promise<void>;
}

export async function assertProcessingActive(
  context?: ProcessingContext,
): Promise<void> {
  if (context && !(await context.isActive())) {
    throw new ProcessingStoppedError();
  }
}

export class ProcessingStoppedError extends ApplicationError {
  constructor() {
    super('Source processing is no longer active', 'PROCESSING_STOPPED', 409);
  }
}
