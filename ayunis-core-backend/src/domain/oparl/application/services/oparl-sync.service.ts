import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';
import type { OparlSystem } from 'src/domain/oparl/domain/oparl-system.entity';
import type {
  OparlSyncRun,
  OparlTypeCounts,
} from 'src/domain/oparl/domain/oparl-sync-run.entity';
import type { OparlPage } from 'src/domain/oparl/application/models/oparl-object';
import type { OparlSyncProgress } from 'src/domain/oparl/application/models/oparl-sync-progress';
import { OPARL_BODY_LISTS } from 'src/domain/oparl/application/models/oparl-type-specs';
import { OparlClientPort } from 'src/domain/oparl/application/ports/oparl-client.port';
import { OparlMirrorRepository } from 'src/domain/oparl/application/ports/oparl-mirror.repository';
import { OparlSystemsRepository } from 'src/domain/oparl/application/ports/oparl-systems.repository';
import {
  OparlInvalidResponseError,
  OparlRequestFailedError,
  OparlSyncInterruptedError,
} from 'src/domain/oparl/application/oparl.errors';
import {
  isOparlSystemObject,
  systemMetadata,
} from 'src/domain/oparl/domain/oparl-system-object';
import {
  OparlPageWriter,
  type OparlPageResult,
  type OparlWrittenBody,
} from './oparl-page-writer.service';

/** Lists of a body fetched at once; locations wait for the rest. */
const PARALLEL_LISTS = 2;
const MAX_PAGES_PER_LIST = 100_000;

export interface OparlSyncContext {
  system: OparlSystem;
  run: OparlSyncRun;
  progress: OparlSyncProgress;
  saveProgress: (progress: OparlSyncProgress) => Promise<void>;
  /** Aborted on shutdown: the listing stops between pages. */
  signal: AbortSignal;
}

export interface OparlSyncOutcome {
  /** Why the listing stopped; `null` when every list was read to its end. */
  listingError: string | null;
  /** Listed items without an OParl ID: skipped, but the listing is not complete. */
  invalidObjects: number;
}

interface ListTask {
  bodyId: OparlWrittenBody['id'];
  key: string;
  url: string;
  type: OparlEntityType;
}

/** A run in progress: lists are fetched in parallel, but written one page at a time. */
interface RunState extends OparlSyncContext {
  outcome: OparlSyncOutcome;
  /**
   * The last write queued. Writes of one run go one after another, so two
   * lists that embed the same objects never lock their rows in opposite
   * orders; runs of different systems share no rows.
   */
  writes: Promise<unknown>;
}

class ListingFailedError extends Error {}

function formatModifiedSince(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function addCounts(target: OparlTypeCounts, source: OparlTypeCounts): void {
  for (const [type, n] of Object.entries(source) as Array<
    [OparlEntityType, number]
  >)
    target[type] = (target[type] ?? 0) + n;
}

/**
 * The listing part of a run: refreshes the system, its bodies and every
 * list of each body, page by page, and records in the progress where it
 * stands. A remote failure ends the listing and is reported, not thrown.
 */
@Injectable()
export class OparlSyncService {
  private readonly logger = new Logger(OparlSyncService.name);

  constructor(
    private readonly client: OparlClientPort,
    private readonly writer: OparlPageWriter,
    private readonly mirror: OparlMirrorRepository,
    private readonly systems: OparlSystemsRepository,
  ) {}

  async sync(context: OparlSyncContext): Promise<OparlSyncOutcome> {
    const state: RunState = {
      ...context,
      outcome: {
        listingError: null,
        invalidObjects: context.progress.invalidObjects ?? 0,
      },
      writes: Promise.resolve(),
    };
    state.progress.stats = state.run.stats;
    try {
      const bodies = await this.syncSystemAndBodies(state);
      for (const body of bodies) await this.syncBody(state, body);
    } catch (error) {
      if (context.signal.aborted) throw new OparlSyncInterruptedError();
      if (!this.isRemoteFailure(error)) throw error;
      state.outcome.listingError = (error as Error).message;
    }
    await this.write(state, () =>
      this.mirror.linkReferences(context.system.id),
    );
    return state.outcome;
  }

  private isRemoteFailure(error: unknown): boolean {
    return (
      error instanceof ListingFailedError ||
      (error instanceof ApplicationError && error.statusCode < 500)
    );
  }

  private write<T>(state: RunState, operation: () => Promise<T>): Promise<T> {
    const result = state.writes.then(operation);
    state.writes = result.catch(() => undefined);
    return result;
  }

  private async syncSystemAndBodies(
    state: RunState,
  ): Promise<OparlWrittenBody[]> {
    const { system, run } = state;
    const object = await this.client.fetchObject(system.url, {
      signal: state.signal,
    });
    if (!isOparlSystemObject(object))
      throw new OparlInvalidResponseError(system.url, 'not an OParl System');
    await this.systems.updateMetadata(system.id, systemMetadata(object));
    const items = await this.readAll(state, object.body);
    const { bodies, result } = await this.write(state, () =>
      this.writer.writeBodies(system.id, items, this.listingRunId(run)),
    );
    // Listed again by every resume, so not counted in the progress.
    this.record(state, result, object.body, false);
    return bodies;
  }

  private async readAll(state: RunState, url: string): Promise<unknown[]> {
    const items: unknown[] = [];
    const visited = new Set<string>();
    for (let next: string | null = url; next;) {
      if (visited.has(next))
        throw new ListingFailedError(`Pagination loops at ${next}`);
      visited.add(next);
      const page = await this.fetchCounted(state, next);
      items.push(...page.data);
      next = page.nextUrl;
    }
    return items;
  }

  private async syncBody(
    state: RunState,
    body: OparlWrittenBody,
  ): Promise<void> {
    const tasks: ListTask[] = OPARL_BODY_LISTS.flatMap(({ property, type }) => {
      const url = body.raw[property];
      return typeof url === 'string'
        ? [{ bodyId: body.id, key: `${body.oparlId} ${property}`, url, type }]
        : [];
    });
    const isLocation = (task: ListTask) =>
      task.type === OparlEntityType.LOCATION;
    await this.runInParallel(
      tasks.filter((task) => !isLocation(task)),
      (task) => this.syncList(state, task),
    );
    // A listed location is kept only as the place of something linked by now.
    await this.write(state, () => this.mirror.linkReferences(state.system.id));
    for (const task of tasks.filter(isLocation))
      await this.syncList(state, task);
  }

  /** Runs the tasks a few at a time; the first failure stops the others after their current page. */
  private async runInParallel(
    tasks: ListTask[],
    run: (task: ListTask) => Promise<void>,
  ): Promise<void> {
    const queue = [...tasks];
    const failures: Error[] = [];
    const worker = async () => {
      for (let task = queue.shift(); task; task = queue.shift()) {
        try {
          await run(task);
        } catch (error) {
          failures.push(error as Error);
          queue.length = 0;
        }
      }
    };
    await Promise.all(Array.from({ length: PARALLEL_LISTS }, worker));
    if (failures.length > 0) throw failures[0];
  }

  private async syncList(state: RunState, task: ListTask): Promise<void> {
    const { cursors } = state.progress;
    if (cursors[task.key] === null) return;
    const resumed = task.key in cursors;
    let url = cursors[task.key] ?? this.firstPageUrl(state, task.url);
    const visited = new Set<string>();
    while (url) {
      state.signal.throwIfAborted();
      if (visited.has(url) || visited.size >= MAX_PAGES_PER_LIST)
        throw new ListingFailedError(`Pagination loops at ${url}`);
      visited.add(url);
      const isFirst = !resumed && visited.size === 1;
      const page = await this.fetchPage(state, task, url, isFirst);
      const result = await this.write(state, () =>
        this.writer.writePage(
          { systemId: state.system.id, bodyId: task.bodyId },
          task.type,
          page.data,
          this.listingRunId(state.run),
        ),
      );
      this.record(state, result, url);
      url = page.nextUrl ?? '';
      cursors[task.key] = page.nextUrl;
      await state.saveProgress(state.progress);
    }
  }

  /**
   * A page. On the first page of a delta, a list that rejects
   * `modified_since` (400; Aarbergen's locations) is listed completely
   * instead, with changes detected per object; the other lists keep the
   * filter. Not remembered: the next delta tries the filter again. A list
   * that answers 404 for no changes (Sternberg's consultations) has none,
   * once the list itself is confirmed to exist.
   */
  private async fetchPage(
    state: RunState,
    task: ListTask,
    url: string,
    isFirst: boolean,
  ): Promise<OparlPage> {
    const filtered = url.includes('modified_since=');
    try {
      return await this.fetchCounted(state, url);
    } catch (error) {
      const status =
        filtered && isFirst && error instanceof OparlRequestFailedError
          ? error.status
          : null;
      if (status === 404) {
        await this.fetchCounted(state, task.url);
        return { data: [], nextUrl: null, totalElements: 0 };
      }
      if (status !== 400) throw error;
      this.logger.warn(
        { systemId: state.system.id, list: task.key },
        'modified_since rejected, listing completely',
      );
      return this.fetchCounted(state, task.url);
    }
  }

  private async fetchCounted(state: RunState, url: string): Promise<OparlPage> {
    const page = await this.client.fetchPage(url, { signal: state.signal });
    state.run.stats.pages++;
    return page;
  }

  private firstPageUrl(state: RunState, listUrl: string): string {
    const since = state.run.modifiedSince;
    if (!since) return listUrl;
    const url = new URL(listUrl);
    url.searchParams.set('modified_since', formatModifiedSince(since));
    return url.href;
  }

  private listingRunId(run: OparlSyncRun) {
    return run.reconciles ? run.id : null;
  }

  private record(
    state: RunState,
    result: OparlPageResult,
    url: string,
    resumable = true,
  ): void {
    addCounts(state.run.stats.written, result.written);
    addCounts(state.run.stats.deleted, result.deleted);
    if (result.invalid === 0) return;
    // Skipped; the listing goes on, but removes nothing as unlisted.
    state.outcome.invalidObjects += result.invalid;
    if (resumable)
      state.progress.invalidObjects =
        (state.progress.invalidObjects ?? 0) + result.invalid;
    this.logger.warn(
      { systemId: state.system.id, url, count: result.invalid },
      'OParl objects without ID',
    );
  }
}
