import { registerAs } from '@nestjs/config';

type ProcessingQueue = 'document' | 'largeDocument' | 'dataSource' | 'urlCrawl';

const CONCURRENCY = {
  document: { variable: 'INGESTION_DOCUMENT_CONCURRENCY', fallback: 4 },
  largeDocument: {
    variable: 'INGESTION_LARGE_DOCUMENT_CONCURRENCY',
    fallback: 2,
  },
  dataSource: { variable: 'INGESTION_DATA_SOURCE_CONCURRENCY', fallback: 2 },
  urlCrawl: { variable: 'INGESTION_URL_CRAWL_CONCURRENCY', fallback: 2 },
} as const;

/** Whether the API process also works through the ingestion queues. */
export function ingestionInApi(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = env.INGESTION_IN_API || 'true';
  if (value !== 'true' && value !== 'false') {
    throw new Error('INGESTION_IN_API must be true or false');
  }
  return value === 'true';
}

export function ingestionConcurrency(queue: ProcessingQueue): number {
  const { variable, fallback } = CONCURRENCY[queue];
  const value = Number(process.env[variable] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error(`${variable} must be a positive integer`);
  return value;
}

const DEFAULT_LARGE_FILE_BYTES = 20 * 1024 * 1024;

/** Documents from this size on take the lane for long-running jobs. */
export function ingestionLargeFileBytes(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const value = Number(
    env.INGESTION_LARGE_FILE_BYTES || DEFAULT_LARGE_FILE_BYTES,
  );
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error('INGESTION_LARGE_FILE_BYTES must be a positive integer');
  return value;
}

const DEFAULT_WORKER_HEALTH_PORT = 3009;

/**
 * Loopback port of the worker's health endpoint. A configured value has
 * already been moved to the dev slot by the env loader; the default follows
 * the slot here, so each local stack can run a worker beside its frontend,
 * which owns 3001 plus the slot offset.
 */
export function ingestionWorkerHealthPort(
  env: NodeJS.ProcessEnv = process.env,
): number {
  if (env.INGESTION_WORKER_HEALTH_PORT) {
    return Number(env.INGESTION_WORKER_HEALTH_PORT);
  }
  const offset = Number.parseInt(env.DEV_PORT_OFFSET ?? '', 10);
  return DEFAULT_WORKER_HEALTH_PORT + (Number.isInteger(offset) ? offset : 0);
}

export default registerAs('ingestion', () => ({
  inApi: ingestionInApi(),
  documentConcurrency: ingestionConcurrency('document'),
  largeDocumentConcurrency: ingestionConcurrency('largeDocument'),
  largeFileBytes: ingestionLargeFileBytes(),
  dataSourceConcurrency: ingestionConcurrency('dataSource'),
  urlCrawlConcurrency: ingestionConcurrency('urlCrawl'),
}));
