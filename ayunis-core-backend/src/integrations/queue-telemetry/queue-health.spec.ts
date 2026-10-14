import type { Queue } from 'bullmq';
import { sampleQueueHealth } from './queue-health';

describe('queue health', () => {
  const gauges: Record<string, number> = {};
  const metrics = {
    setGauge: jest.fn(
      (name: string, value: number, tags: { queue: string }) => {
        expect(tags).toEqual({ queue: 'document-processing' });
        gauges[name] = value;
      },
    ),
  };
  const queue = {
    name: 'document-processing',
    getJobCounts: jest.fn(),
    getWorkersCount: jest.fn().mockResolvedValue(2),
    client: Promise.resolve({
      llen: async (key: string) => (key.endsWith('wait') ? 2 : 0),
      lrange: async () => ['newer-upload', 'older-upload'],
      hget: async (key: string) =>
        key.endsWith('older-upload') ? '1000' : '9000',
    }),
    toKey: (key: string) => `bull:document-processing:${key}`,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queue.getJobCounts.mockResolvedValue({
      waiting: 2,
      active: 1,
      delayed: 3,
      completed: 4,
      failed: 5,
    });
  });

  it('exports inventory and the oldest timestamp even behind the FIFO head', async () => {
    await sampleQueueHealth(queue as unknown as Queue, metrics, 11000);
    expect(gauges).toEqual({
      bullmq_jobs_waiting: 2,
      bullmq_jobs_active: 1,
      bullmq_jobs_delayed: 3,
      bullmq_jobs_completed: 4,
      bullmq_jobs_failed: 5,
      bullmq_workers_registered: 2,
      bullmq_oldest_waiting_age_seconds: 10,
    });
    expect(metrics.setGauge.mock.calls.every((call) => call.length === 3)).toBe(
      true,
    );
  });

  it('clears the age when the waiting queue becomes empty', async () => {
    queue.getJobCounts.mockResolvedValue({ waiting: 0 });
    await sampleQueueHealth(queue as unknown as Queue, metrics, 11000);
    expect(gauges.bullmq_oldest_waiting_age_seconds).toBe(0);
  });

  it('does not publish misleading zeros when Redis fails', async () => {
    queue.getJobCounts.mockRejectedValueOnce(new Error('Redis unavailable'));
    await expect(
      sampleQueueHealth(queue as unknown as Queue, metrics),
    ).rejects.toThrow();
    expect(metrics.setGauge).not.toHaveBeenCalled();
  });
});
