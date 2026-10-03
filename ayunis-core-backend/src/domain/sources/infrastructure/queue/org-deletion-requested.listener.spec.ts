import { OrgProcessingDeletionListener } from './org-deletion-requested.listener';
import { OrgDeletionRequestedEvent } from 'src/iam/orgs/application/events/org-deletion-requested.event';
import type { Queue } from 'bullmq';
const orgId = '11111111-1111-1111-1111-111111111111';

function createJob(id: string, jobOrgId = orgId, active = false) {
  return {
    id,
    data: { orgId: jobOrgId },
    remove: jest.fn().mockResolvedValue(undefined),
    isActive: jest.fn().mockResolvedValue(active),
  };
}

type TestJob = ReturnType<typeof createJob>;

function scannedQueue(pages: string[][], jobs: Map<string, TestJob>) {
  const scan = jest.fn().mockImplementation((cursor: string) => {
    const index = Number(cursor);
    const nextCursor = index + 1 < pages.length ? String(index + 1) : '0';
    return Promise.resolve([nextCursor, pages[index] ?? []]);
  });
  const getJobs = jest.fn().mockResolvedValue([]);
  const queue = {
    qualifiedName: 'bull:test',
    keys: {
      active: 'bull:test:active',
      wait: 'bull:test:wait',
    },
    client: Promise.resolve({ scan }),
    getJob: jest
      .fn()
      .mockImplementation((jobId: string) => Promise.resolve(jobs.get(jobId))),
    getJobs,
  } as unknown as Queue;
  return { getJobs, queue, scan };
}

function jobKey(job: TestJob): string {
  return `bull:test:${job.id}`;
}

function emptyQueue(): Queue {
  return scannedQueue([[]], new Map()).queue;
}

it('scans stable key pages and removes only retained target payloads', async () => {
  const owned = createJob('owned');
  const other = Array.from({ length: 101 }, (_, index) =>
    createJob(`other-${index}`, 'other'),
  );
  const jobs = new Map([owned, ...other].map((job) => [job.id, job]));
  const firstPage = other.slice(0, 100).map(jobKey);
  const { queue, scan } = scannedQueue(
    [
      ['bull:test:active', 'bull:test:owned:logs', ...firstPage],
      [jobKey(owned), jobKey(other[100])],
      [jobKey(owned)],
    ],
    jobs,
  );
  const listener = new OrgProcessingDeletionListener(
    queue,
    emptyQueue(),
    emptyQueue(),
  );
  const event = new OrgDeletionRequestedEvent(orgId);
  await listener.handle(event);
  expect(owned.remove).not.toHaveBeenCalled();
  await Promise.all(event.takeCleanupTasks().map((task) => task.run()));
  expect(owned.remove).toHaveBeenCalledTimes(1);
  expect(other.every((job) => job.remove.mock.calls.length === 0)).toBe(true);
  expect(scan).toHaveBeenCalledWith('0', expect.any(Object));
  expect(scan).toHaveBeenCalledWith('1', expect.any(Object));
  expect(scan).toHaveBeenCalledWith('2', expect.any(Object));
  expect(scan.mock.invocationCallOrder.at(-1)).toBeLessThan(
    owned.remove.mock.invocationCallOrder[0],
  );
});

it('finds an active job after other jobs change state between scan batches', async () => {
  const owned = createJob('owned', orgId, true);
  const other = Array.from({ length: 100 }, (_, index) =>
    createJob(`other-${index}`, 'other'),
  );
  const jobs = new Map([owned, ...other].map((job) => [job.id, job]));
  const { getJobs, queue, scan } = scannedQueue(
    [other.map(jobKey), [jobKey(owned)]],
    jobs,
  );
  const event = new OrgDeletionRequestedEvent(orgId);
  await expect(
    new OrgProcessingDeletionListener(queue, emptyQueue(), emptyQueue()).handle(
      event,
    ),
  ).rejects.toMatchObject({ code: 'ORG_PROCESSING_ACTIVE' });
  expect(owned.remove).not.toHaveBeenCalled();
  expect(scan).toHaveBeenCalledWith('1', expect.any(Object));
  expect(getJobs).not.toHaveBeenCalled();
});

it('waits for each removal batch before starting the next one', async () => {
  let releaseFirst!: () => void;
  const firstRemoval = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const jobs = Array.from({ length: 101 }, (_, index) =>
    createJob(`owned-${index}`),
  );
  jobs[0].remove.mockReturnValueOnce(firstRemoval);
  const queue = scannedQueue(
    [jobs.slice(0, 100).map(jobKey), jobs.slice(100).map(jobKey)],
    new Map(jobs.map((job) => [job.id, job])),
  ).queue;
  const event = new OrgDeletionRequestedEvent(orgId);
  await new OrgProcessingDeletionListener(
    queue,
    emptyQueue(),
    emptyQueue(),
  ).handle(event);

  const cleanup = event.takeCleanupTasks()[0].run();
  await new Promise(setImmediate);

  expect(jobs[99].remove).toHaveBeenCalled();
  expect(jobs[100].remove).not.toHaveBeenCalled();
  releaseFirst();
  await cleanup;
  expect(jobs[100].remove).toHaveBeenCalled();
});

import { Test } from '@nestjs/testing';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { getQueueToken } from '@nestjs/bullmq';
import { DOCUMENT_PROCESSING_QUEUE } from './document-processing.constants';
import { DATA_SOURCE_PROCESSING_QUEUE } from './data-source-processing.constants';
import { URL_CRAWL_QUEUE } from './url-crawl.constants';
import { DeleteOrgUseCase } from 'src/iam/orgs/application/use-cases/delete-org/delete-org.use-case';
import { DeleteOrgCommand } from 'src/iam/orgs/application/use-cases/delete-org/delete-org.command';

it('rejects active processing through Nest event dispatch before deleting any rows', async () => {
  const active = createJob('target-active', orgId, true);
  const queue = scannedQueue(
    [[jobKey(active)]],
    new Map([[active.id, active]]),
  ).queue;
  const module = await Test.createTestingModule({
    imports: [EventEmitterModule.forRoot()],
    providers: [
      OrgProcessingDeletionListener,
      ...[
        DOCUMENT_PROCESSING_QUEUE,
        DATA_SOURCE_PROCESSING_QUEUE,
        URL_CRAWL_QUEUE,
      ].map((name) => ({ provide: getQueueToken(name), useValue: queue })),
    ],
  }).compile();
  await module.init();
  try {
    const rows = { delete: jest.fn() };
    const deletion = new DeleteOrgUseCase(
      rows as never,
      module.get(EventEmitter2),
    );
    await expect(
      deletion.execute(new DeleteOrgCommand(orgId, 'confirm', true)),
    ).rejects.toMatchObject({ code: 'ORG_PROCESSING_ACTIVE' });
    expect(rows.delete).not.toHaveBeenCalled();
  } finally {
    await module.close();
  }
});
