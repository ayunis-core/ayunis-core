import {
  ingestionConsumers,
  ingestionConcurrency,
  ingestionProcessRole,
} from './ingestion.config';

describe('ingestion runtime configuration', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });
  it('retains combined operation for existing deployments', () => {
    delete process.env.INGESTION_PROCESS_ROLE;
    expect(ingestionProcessRole()).toBe('combined');
    expect(ingestionConsumers([class Consumer {}])).toHaveLength(1);
  });
  it('keeps queue consumers out of the API process', () => {
    process.env.INGESTION_PROCESS_ROLE = 'api';
    expect(ingestionConsumers([class Consumer {}])).toEqual([]);
  });
  it('runs consumers in a standalone worker', () => {
    process.env.INGESTION_PROCESS_ROLE = 'worker';
    expect(ingestionConsumers([class Consumer {}])).toHaveLength(1);
  });
  it('rejects an unknown process role', () => {
    process.env.INGESTION_PROCESS_ROLE = 'workre';
    expect(() => ingestionProcessRole()).toThrow('INGESTION_PROCESS_ROLE');
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
