import {
  ingestionConcurrency,
  ingestionInApi,
  ingestionWorkerHealthPort,
} from './ingestion.config';

describe('ingestion configuration', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });
  it('processes in the API unless told otherwise', () => {
    expect(ingestionInApi({})).toBe(true);
    expect(ingestionInApi({ INGESTION_IN_API: '' })).toBe(true);
    expect(ingestionInApi({ INGESTION_IN_API: 'false' })).toBe(false);
  });
  it('rejects a value that is neither true nor false', () => {
    expect(() => ingestionInApi({ INGESTION_IN_API: 'flase' })).toThrow(
      'INGESTION_IN_API',
    );
  });
  it('keeps the worker health port clear of the local frontend on every dev slot', () => {
    expect(ingestionWorkerHealthPort({})).toBe(3009);
    expect(ingestionWorkerHealthPort({ DEV_PORT_OFFSET: '560' })).toBe(3569);
    expect(
      ingestionWorkerHealthPort({
        INGESTION_WORKER_HEALTH_PORT: '3011',
        DEV_PORT_OFFSET: '560',
      }),
    ).toBe(3011);
  });
  it('bounds configurable concurrency and preserves the existing defaults', () => {
    delete process.env.INGESTION_DOCUMENT_CONCURRENCY;
    expect(ingestionConcurrency('document')).toBe(4);
    process.env.INGESTION_DOCUMENT_CONCURRENCY = '2';
    expect(ingestionConcurrency('document')).toBe(2);
    process.env.INGESTION_DOCUMENT_CONCURRENCY = '0';
    expect(() => ingestionConcurrency('document')).toThrow(
      'INGESTION_DOCUMENT_CONCURRENCY',
    );
  });
});
