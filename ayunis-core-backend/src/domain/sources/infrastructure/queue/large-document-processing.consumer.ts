import { Processor } from '@nestjs/bullmq';
import { ingestionConcurrency } from 'src/config/ingestion.config';
import { LARGE_DOCUMENT_PROCESSING_QUEUE } from './document-processing.constants';
import { DocumentProcessingConsumer } from './document-processing.consumer';
import { documentRetryDelayMs } from './bullmq-job.helpers';

@Processor(LARGE_DOCUMENT_PROCESSING_QUEUE, {
  concurrency: ingestionConcurrency('largeDocument'),
  settings: {
    backoffStrategy: (attemptsMade, _type, error) =>
      documentRetryDelayMs(attemptsMade, error),
  },
})
export class LargeDocumentProcessingConsumer extends DocumentProcessingConsumer {}
