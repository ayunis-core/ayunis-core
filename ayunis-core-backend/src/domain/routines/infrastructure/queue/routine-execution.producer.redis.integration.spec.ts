import { randomUUID } from 'crypto';
import { Queue } from 'bullmq';
import type { RoutineExecutionJobData } from 'src/domain/routines/application/ports/routine-execution-queue.port';
import {
  TEST_ORG_ID,
  TEST_ROUTINE_ID,
  TEST_USER_ID,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { RoutineRunTrigger } from 'src/domain/routines/domain/routine-run-trigger.enum';
import { ROUTINE_EXECUTION_QUEUE } from './routine-execution.constants';
import { RoutineExecutionProducer } from './routine-execution.producer';

// CI provides this real Redis for the queue telemetry tests as well.
const redisPort = process.env.QUEUE_TELEMETRY_REDIS_PORT;
const describeRedis = redisPort ? describe : describe.skip;

describeRedis('RoutineExecutionProducer against real Redis', () => {
  const target = {
    routineId: TEST_ROUTINE_ID,
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  };
  let queue: Queue<RoutineExecutionJobData>;
  let producer: RoutineExecutionProducer;

  beforeEach(() => {
    queue = new Queue(ROUTINE_EXECUTION_QUEUE, {
      connection: {
        host: '127.0.0.1',
        port: Number(redisPort),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
      },
      prefix: `routine-producer-test-${randomUUID()}`,
    });
    producer = new RoutineExecutionProducer(queue);
  });

  afterEach(async () => {
    await queue.obliterate({ force: true });
    await queue.close();
  });

  it('adds one job per scheduled start, however often it is enqueued', async () => {
    await producer.enqueueScheduled(target, '2026-11-07-0732');
    await producer.enqueueScheduled(target, '2026-11-07-0732');

    const jobs = await queue.getJobs(['waiting']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe(`routine-${TEST_ROUTINE_ID}-2026-11-07-0732`);
    expect(jobs[0].opts.attempts).toBe(3);
    expect(jobs[0].data).toEqual({
      ...target,
      trigger: RoutineRunTrigger.SCHEDULED,
    });
  });

  it("adds the next day's scheduled run as its own job", async () => {
    await producer.enqueueScheduled(target, '2026-11-07-0732');
    await producer.enqueueScheduled(target, '2026-11-08-0732');

    await expect(queue.getWaitingCount()).resolves.toBe(2);
  });

  it('gives each Run now job an id that stays unique after Redis loses its data', async () => {
    await producer.enqueueRunNow(target);

    const [job] = await queue.getJobs(['waiting']);
    expect(job.id).toMatch(
      new RegExp(`^routine-${TEST_ROUTINE_ID}-run-now-[0-9a-f-]{36}$`),
    );
  });

  it('queues one Run now while one is pending, however often it is clicked', async () => {
    await producer.enqueueRunNow(target);
    await producer.enqueueRunNow(target);

    await expect(queue.getWaitingCount()).resolves.toBe(1);
  });

  it('keeps a Run now and the same day’s scheduled run apart', async () => {
    await producer.enqueueRunNow(target);
    await producer.enqueueScheduled(target, '2026-11-07-0732');

    const jobs = await queue.getJobs(['waiting']);
    expect(
      jobs.map((job) => job.data.trigger).sort((a, b) => a.localeCompare(b)),
    ).toEqual([RoutineRunTrigger.RUN_NOW, RoutineRunTrigger.SCHEDULED]);
  });
});
