import { DATA_SOURCE_PROCESSING_QUEUE } from 'src/domain/sources/infrastructure/queue/data-source-processing.constants';
import { DOCUMENT_PROCESSING_QUEUE } from 'src/domain/sources/infrastructure/queue/document-processing.constants';
import { URL_CRAWL_QUEUE } from 'src/domain/sources/infrastructure/queue/url-crawl.constants';

export const BULL_BOARD_PATH = '/internal/queues';

export const QUEUE_INSPECTION_QUEUE_NAMES = [
  DOCUMENT_PROCESSING_QUEUE,
  DATA_SOURCE_PROCESSING_QUEUE,
  URL_CRAWL_QUEUE,
] as const;
