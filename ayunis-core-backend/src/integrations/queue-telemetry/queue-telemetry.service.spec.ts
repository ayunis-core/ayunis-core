import { Appsignal } from '@appsignal/nodejs';
import type { Queue } from 'bullmq';
import { QueueTelemetryService } from './queue-telemetry.service';

jest.mock('@appsignal/nodejs', () => ({
  Appsignal: { client: { isActive: true, metrics: jest.fn() } },
}));

describe('queue sampler lifecycle', () => {
  const gauges: { name: string; value: number; queue: string }[] = [];
  const metrics = {
    setGauge: (name: string, value: number, tags: { queue: string }) => {
      gauges.push({ name, value, queue: tags.queue });
    },
  };
  const queues = [
    'document-processing',
    'data-source-processing',
    'url-crawl',
  ].map((name) => ({
    name,
    getJobCounts: jest.fn(),
    getWaiting: jest.fn(),
    getWorkersCount: jest.fn().mockResolvedValue(1),
  }));
  const service = new QueueTelemetryService(
    ...(queues as unknown as [Queue, Queue, Queue]),
  );

  beforeEach(() => {
    gauges.length = 0;
    jest.clearAllMocks();
    jest.mocked(Appsignal.client.metrics).mockReturnValue(metrics as never);
    for (const queue of queues) {
      queue.getJobCounts.mockResolvedValue({
        waiting: 0,
        active: 0,
        delayed: 0,
        completed: 0,
        failed: 0,
      });
    }
  });

  afterEach(() => jest.restoreAllMocks());

  it('does not sample when AppSignal was not bootstrapped in development', async () => {
    jest.replaceProperty(Appsignal, 'client', undefined as never);
    await expect(service.sample()).resolves.toBeUndefined();
    expect(gauges).toHaveLength(0);
  });

  it('exports all three queues independently', async () => {
    await service.sample();
    expect(new Set(gauges.map((gauge) => gauge.queue))).toEqual(
      new Set(queues.map((queue) => queue.name)),
    );
    expect(gauges).toHaveLength(21);
  });

  it('one unavailable queue does not suppress the other queues or future samples', async () => {
    queues[0].getJobCounts.mockRejectedValueOnce(
      new Error('Redis unavailable'),
    );
    await service.sample();
    expect(gauges).toHaveLength(14);
    await service.sample();
    expect(gauges).toHaveLength(35);
  });

  it('skips overlapping ticks until the prior sample settles', async () => {
    let release!: (counts: Record<string, number>) => void;
    queues[0].getJobCounts.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const first = service.sample();
    await service.sample();
    expect(gauges).toHaveLength(0);
    release({ waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0 });
    await first;
    expect(gauges).toHaveLength(21);
  });
});
