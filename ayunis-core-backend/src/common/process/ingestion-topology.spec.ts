import { IngestionTopology } from './ingestion-topology';

class Consumer {}

function topology(env: NodeJS.ProcessEnv = {}): IngestionTopology {
  return new IngestionTopology(() => env);
}

describe('ingestion topology', () => {
  it('keeps processing in the API for existing deployments', () => {
    expect(topology().consumers([Consumer])).toHaveLength(1);
    expect(
      topology({ INGESTION_IN_API: '' }).consumers([Consumer]),
    ).toHaveLength(1);
  });
  it('keeps queue consumers out of an API that hands processing to a worker', () => {
    const api = topology({ INGESTION_IN_API: 'false' });
    expect(api.isWorker).toBe(false);
    expect(api.consumers([Consumer])).toEqual([]);
  });
  it('runs consumers in the worker process whatever the API setting says', () => {
    const worker = topology({ INGESTION_IN_API: 'false' });
    worker.declareWorker();
    expect(worker.isWorker).toBe(true);
    expect(worker.consumers([Consumer])).toHaveLength(1);
  });
});
