import type { Queue } from 'bullmq';

const BATCH_SIZE = 100;

export async function oldestWaitingTimestamp(
  queue: Queue,
): Promise<number | undefined> {
  const client = await queue.client;
  let oldest: number | undefined;
  for (const state of ['wait', 'paused']) {
    const key = queue.toKey(state);
    const count = await client.llen(key);
    // Bound the scan to the initial list length so concurrent enqueues cannot
    // prolong it indefinitely. Workers can run between every read batch.
    for (let offset = 0; offset < count; offset += BATCH_SIZE) {
      const ids = await client.lrange(
        key,
        offset,
        Math.min(offset + BATCH_SIZE - 1, count - 1),
      );
      if (ids.length === 0) break;
      const timestamp = await oldestInBatch(queue, ids);
      if (timestamp !== undefined)
        oldest = Math.min(oldest ?? timestamp, timestamp);
    }
  }
  return oldest;
}

async function oldestInBatch(
  queue: Queue,
  ids: string[],
): Promise<number | undefined> {
  const client = await queue.client;
  const values = await Promise.all(
    ids.map((id) => client.hget(queue.toKey(id), 'timestamp')),
  );
  let oldest: number | undefined;
  for (const value of values) {
    if (value === null) continue;
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp)) throw new Error('Invalid job timestamp');
    oldest = Math.min(oldest ?? timestamp, timestamp);
  }
  return oldest;
}
