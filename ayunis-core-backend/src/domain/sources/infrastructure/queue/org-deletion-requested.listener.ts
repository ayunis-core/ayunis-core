import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import type { Job } from 'bullmq';
import { OrgDeletionRequestedEvent } from 'src/iam/orgs/application/events/org-deletion-requested.event';
import { OrgProcessingActiveError } from 'src/iam/orgs/application/orgs.errors';
import { DOCUMENT_PROCESSING_QUEUE } from './document-processing.constants';
import { DATA_SOURCE_PROCESSING_QUEUE } from './data-source-processing.constants';
import { URL_CRAWL_QUEUE } from './url-crawl.constants';

const JOB_PAGE_SIZE = 100;
const LOCKED_JOB_RETRIES = 20;
const LOCKED_JOB_RETRY_DELAY_MS = 50;
type OrgJob = Job<{ orgId?: string }>;

@Injectable()
export class OrgProcessingDeletionListener {
  constructor(
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE) private readonly documents: Queue,
    @InjectQueue(DATA_SOURCE_PROCESSING_QUEUE)
    private readonly dataSources: Queue,
    @InjectQueue(URL_CRAWL_QUEUE) private readonly urls: Queue,
  ) {}

  @OnEvent(OrgDeletionRequestedEvent.EVENT_NAME, { suppressErrors: false })
  async handle(event: OrgDeletionRequestedEvent): Promise<void> {
    if (await this.hasActiveJob(event.orgId))
      throw new OrgProcessingActiveError();
    event.deferCleanup('purge processing jobs', async () => {
      const jobs = await this.findJobs(event.orgId);
      await this.removeJobs(jobs);
    });
  }

  private async hasActiveJob(orgId: string): Promise<boolean> {
    for (const queue of this.queues) {
      for await (const page of this.scanJobPages(queue)) {
        const owned = page.filter((job) => job.data.orgId === orgId);
        if (
          (await Promise.all(owned.map((job) => job.isActive()))).some(Boolean)
        )
          return true;
      }
    }
    return false;
  }

  private async findJobs(orgId: string): Promise<OrgJob[]> {
    const jobs = await Promise.all(
      this.queues.map(async (queue) => {
        const owned = new Map<string, OrgJob>();
        for await (const page of this.scanJobPages(queue)) {
          for (const job of page) {
            if (job.data.orgId === orgId && job.id) owned.set(job.id, job);
          }
        }
        return [...owned.values()];
      }),
    );
    return jobs.flat();
  }

  private async *scanJobPages(queue: Queue): AsyncGenerator<OrgJob[]> {
    const client = await queue.client;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(cursor, {
        MATCH: `${queue.qualifiedName}:*`,
        COUNT: JOB_PAGE_SIZE,
      });
      cursor = nextCursor;
      const jobIds = this.jobIds(queue, keys);
      for (let start = 0; start < jobIds.length; start += JOB_PAGE_SIZE) {
        const jobs = await Promise.all(
          jobIds
            .slice(start, start + JOB_PAGE_SIZE)
            .map((jobId) => queue.getJob(jobId) as Promise<OrgJob | undefined>),
        );
        yield jobs.filter((job): job is OrgJob => job !== undefined);
      }
    } while (cursor !== '0');
  }

  private jobIds(queue: Queue, keys: string[]): string[] {
    const prefix = `${queue.qualifiedName}:`;
    const infrastructureKeys = new Set(Object.values(queue.keys));
    return [
      ...new Set(
        keys.flatMap((key) => {
          if (infrastructureKeys.has(key)) return [];
          const suffix = key.slice(prefix.length);
          return suffix && !suffix.includes(':') ? [suffix] : [];
        }),
      ),
    ];
  }

  private async removeJobs(jobs: OrgJob[]): Promise<void> {
    for (let start = 0; start < jobs.length; start += JOB_PAGE_SIZE) {
      await Promise.all(
        jobs
          .slice(start, start + JOB_PAGE_SIZE)
          .map((job) => this.removeJob(job)),
      );
    }
  }

  private async removeJob(job: OrgJob): Promise<void> {
    let retriedAfterCompletion = false;
    for (let attempt = 0; attempt <= LOCKED_JOB_RETRIES; attempt += 1) {
      try {
        await job.remove();
        return;
      } catch (error) {
        if (attempt === LOCKED_JOB_RETRIES) {
          throw error;
        }
        if (!(await job.isActive())) {
          if (retriedAfterCompletion) throw error;
          retriedAfterCompletion = true;
          continue;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, LOCKED_JOB_RETRY_DELAY_MS),
        );
      }
    }
  }

  private get queues(): Queue[] {
    return [this.documents, this.dataSources, this.urls];
  }
}
