import { randomUUID } from 'crypto';
import { Queue, Worker, type Job } from 'bullmq';
import { sampleQueueHealth } from './queue-health';

const redisPort = process.env.QUEUE_TELEMETRY_REDIS_PORT;
const describeRedis = redisPort ? describe : describe.skip;

describeRedis('queue health against real Redis', () => {
  const connection = {
    host: '127.0.0.1',
    port: Number(redisPort),
    maxRetriesPerRequest: null,
  };

  it('finds the oldest timestamp beyond 1,000 waiting IDs and while paused', async () => {
    const queue = new Queue('document-processing', {
      connection,
      prefix: `telemetry-test-${randomUUID()}`,
    });
    const gauges: Record<string, number> = {};
    const metrics = {
      setGauge: (key: string, value: number) => {
        gauges[key] = value;
      },
    };
    const now = Date.now();
    const jobs = await queue.addBulk(
      Array.from({ length: 1001 }, (_, index) => ({
        name: 'backlog',
        data: {},
        opts: { timestamp: now - (index === 0 ? 600_000 : 1000) },
      })),
    );
    try {
      await sampleQueueHealth(queue, metrics, now);
      expect(gauges.bullmq_oldest_waiting_age_seconds).toBe(600);
      await queue.pause();
      await sampleQueueHealth(queue, metrics, now);
      expect(gauges.bullmq_jobs_waiting).toBe(1001);
      expect(gauges.bullmq_oldest_waiting_age_seconds).toBe(600);
    } finally {
      for (let offset = 0; offset < jobs.length; offset += 100) {
        await Promise.all(
          jobs.slice(offset, offset + 100).map((job) => job.remove()),
        );
      }
      await queue.close();
    }
  }, 30_000);

  it.each(['document-processing', 'data-source-processing', 'url-crawl'])(
    '%s exports waiting, active, delayed, completed, failed and worker state',
    async (name) => {
      const prefix = `telemetry-test-${randomUUID()}`;
      const queue = new Queue(name, { connection, prefix });
      const gauges: Record<string, number> = {};
      const metrics = {
        setGauge: (key: string, value: number) => {
          gauges[key] = value;
        },
      };
      const jobs: Job[] = [];
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const worker = new Worker(
        name,
        async (job) => {
          if (job.name === 'failure')
            throw new Error('controlled test failure');
          await gate;
        },
        { connection, prefix, autorun: false },
      );
      try {
        await worker.waitUntilReady();
        jobs.push(
          await queue.add(
            'successful',
            { credential: 'must-not-export' },
            { timestamp: Date.now() - 60_000 },
          ),
        );
        jobs.push(await queue.add('delayed', {}, { delay: 60_000 }));
        await sampleQueueHealth(queue, metrics);
        expect(gauges.bullmq_jobs_waiting).toBe(1);
        expect(gauges.bullmq_jobs_delayed).toBe(1);
        expect(gauges.bullmq_oldest_waiting_age_seconds).toBeGreaterThanOrEqual(
          60,
        );
        void worker.run();
        await waitFor(async () => (await jobs[0].getState()) === 'active');
        await sampleQueueHealth(queue, metrics);
        expect(gauges.bullmq_jobs_active).toBe(1);
        expect(gauges.bullmq_workers_registered).toBe(1);
        release();
        await waitFor(async () => (await jobs[0].getState()) === 'completed');
        jobs.push(await queue.add('failure', {}));
        await waitFor(async () => (await jobs[2].getState()) === 'failed');
        await sampleQueueHealth(queue, metrics);
        expect(gauges.bullmq_jobs_completed).toBe(1);
        expect(gauges.bullmq_jobs_failed).toBe(1);
        expect(gauges.bullmq_oldest_waiting_age_seconds).toBe(0);
        await jobs[0].remove();
        jobs[0] = await queue.add('successful', {});
        await waitFor(async () => (await jobs[0].getState()) === 'completed');
        await sampleQueueHealth(queue, metrics);
        expect(gauges.bullmq_jobs_completed).toBe(1);
        expect(JSON.stringify(gauges)).not.toContain('must-not-export');
      } finally {
        release();
        await worker.close();
        for (const job of jobs) await job.remove();
        await queue.close();
      }
    },
    30_000,
  );
});

async function waitFor(check: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error('Queue transition timed out');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
