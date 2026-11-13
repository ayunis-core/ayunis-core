import { ApplicationError } from 'src/common/errors/base.error';

export interface ProcessingContext {
  read(key: string): Promise<string | undefined>;
  /** Reject writes for inactive sources, including deletion during persistence. */
  write(key: string, value: string): Promise<void>;
  isActive(): Promise<boolean>;
  progress(completed: number): Promise<void>;
  /**
   * Receives the texts of extracted pages in document order, each batch as
   * soon as every page before it is extracted, so the caller can work on the
   * start of a document while its end is still being read.
   */
  onPagesExtracted?(texts: readonly string[]): void;
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
