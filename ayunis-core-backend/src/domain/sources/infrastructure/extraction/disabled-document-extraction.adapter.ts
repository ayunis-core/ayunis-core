import { Injectable } from '@nestjs/common';
import {
  DocumentExtractionPort,
  type ExtractionJobStatus,
  type ExtractionResultRef,
  type ReleaseExtractionJobsOutcome,
} from 'src/domain/sources/application/ports/document-extraction.port';
import { DocumentExtractionNotConfiguredError } from 'src/domain/sources/application/sources.errors';

/**
 * Bound while EXTRACTION_SERVICE_URL is unset. Cleanup calls from source and
 * organisation deletion stay no-ops, so those flows need no toggle of their own.
 */
@Injectable()
export class DisabledDocumentExtractionAdapter extends DocumentExtractionPort {
  start(): Promise<ExtractionJobStatus> {
    return Promise.reject(new DocumentExtractionNotConfiguredError());
  }

  status(): Promise<ExtractionJobStatus> {
    return Promise.reject(new DocumentExtractionNotConfiguredError());
  }

  result(): Promise<ExtractionResultRef> {
    return Promise.reject(new DocumentExtractionNotConfiguredError());
  }

  cancel(): Promise<ExtractionJobStatus> {
    return Promise.reject(new DocumentExtractionNotConfiguredError());
  }

  release(): Promise<void> {
    return Promise.resolve();
  }

  releaseOwner(): Promise<ReleaseExtractionJobsOutcome> {
    return Promise.resolve({ released: 0, cancelled: 0 });
  }
}
