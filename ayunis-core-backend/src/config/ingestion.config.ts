import type { Provider } from '@nestjs/common';
import { registerAs } from '@nestjs/config';

type IngestionProcessRole = 'api' | 'worker' | 'combined';
type ProcessingQueue = 'document' | 'dataSource' | 'urlCrawl';

const CONCURRENCY = {
  document: { variable: 'INGESTION_DOCUMENT_CONCURRENCY', fallback: 4 },
  dataSource: { variable: 'INGESTION_DATA_SOURCE_CONCURRENCY', fallback: 2 },
  urlCrawl: { variable: 'INGESTION_URL_CRAWL_CONCURRENCY', fallback: 2 },
} as const;

export function ingestionProcessRole(): IngestionProcessRole {
  const role = process.env.INGESTION_PROCESS_ROLE || 'combined';
  if (role !== 'api' && role !== 'worker' && role !== 'combined') {
    throw new Error('INGESTION_PROCESS_ROLE must be api, worker or combined');
  }
  return role;
}

export function ingestionConcurrency(queue: ProcessingQueue): number {
  const { variable, fallback } = CONCURRENCY[queue];
  const value = Number(process.env[variable] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error(`${variable} must be a positive integer`);
  return value;
}

export function ingestionConsumers<T extends Provider>(consumers: T[]): T[] {
  return ingestionProcessRole() === 'api' ? [] : consumers;
}

export default registerAs('ingestion', () => ({
  role: ingestionProcessRole(),
  documentConcurrency: ingestionConcurrency('document'),
  dataSourceConcurrency: ingestionConcurrency('dataSource'),
  urlCrawlConcurrency: ingestionConcurrency('urlCrawl'),
}));
