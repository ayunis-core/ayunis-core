import type { Queue } from 'bullmq';
import { oldestWaitingTimestamp } from './oldest-waiting-timestamp';

function createQueue(
  lists: Record<string, string[]>,
  timestamps: Record<string, string | null>,
) {
  const requested: string[] = [];
  const client = {
    llen: async (key: string) => lists[key].length,
    lrange: async (key: string, start: number, end: number) => {
      if (end - start + 1 > 100) throw new Error('Unbounded read');
      return lists[key].slice(start, end + 1);
    },
    hget: async (key: string) => {
      requested.push(key);
      return timestamps[key] ?? null;
    },
  };
  return {
    queue: {
      client: Promise.resolve(client),
      toKey: (key: string) => key,
    } as unknown as Queue,
    client,
    requested,
  };
}

describe('non-blocking oldest waiting timestamp', () => {
  it('can miss a moving pagination boundary in one sample and recover on the next', async () => {
    const ids = Array.from({ length: 201 }, (_, index) => `job-${index}`);
    const timestamps = Object.fromEntries(ids.map((id) => [id, '9000']));
    timestamps['job-100'] = '1000';
    const { queue, client } = createQueue(
      { wait: ids, paused: [] },
      timestamps,
    );
    const read = client.lrange;
    let draining = true;
    client.lrange = async (key, start, end) => {
      const result = await read(key, start, end);
      if (draining) {
        ids.splice(0, 100);
        draining = false;
      }
      return result;
    };
    await expect(oldestWaitingTimestamp(queue)).resolves.toBe(9000);
    await expect(oldestWaitingTimestamp(queue)).resolves.toBe(1000);
  });

  it('does not extend the scan to uploads enqueued after the initial list length', async () => {
    const ids = ['initial-upload'];
    const timestamps = { 'initial-upload': '9000', 'new-upload': '1000' };
    const { queue, client, requested } = createQueue(
      { wait: ids, paused: [] },
      timestamps,
    );
    const read = client.lrange;
    client.lrange = async (key, start, end) => {
      ids.push('new-upload');
      return read(key, start, end);
    };
    await expect(oldestWaitingTimestamp(queue)).resolves.toBe(9000);
    expect(requested).toEqual(['initial-upload']);
  });

  it('finds the oldest timestamp across read batches and paused jobs', async () => {
    const ids = Array.from({ length: 101 }, (_, index) => `job-${index}`);
    const timestamps = Object.fromEntries(ids.map((id) => [id, '9000']));
    timestamps['job-100'] = '2000';
    timestamps['paused-upload'] = '1000';
    const { queue } = createQueue(
      { wait: ids, paused: ['paused-upload'] },
      timestamps,
    );
    await expect(oldestWaitingTimestamp(queue)).resolves.toBe(1000);
  });

  it('allows queue transitions between bounded batches and tolerates removed jobs', async () => {
    const ids = Array.from({ length: 101 }, (_, index) => `job-${index}`);
    const timestamps: Record<string, string | null> = Object.fromEntries(
      ids.map((id) => [id, '9000']),
    );
    const { queue, client } = createQueue(
      { wait: ids, paused: [] },
      timestamps,
    );
    const read = client.lrange;
    client.lrange = async (key, start, end) => {
      const result = await read(key, start, end);
      timestamps['job-0'] = null;
      timestamps['job-100'] = '1000';
      return result;
    };
    await expect(oldestWaitingTimestamp(queue)).resolves.toBe(1000);
  });

  it('returns no timestamp when all sampled jobs have disappeared', async () => {
    const { queue } = createQueue(
      { wait: ['removed-upload'], paused: [] },
      { 'removed-upload': null },
    );
    await expect(oldestWaitingTimestamp(queue)).resolves.toBeUndefined();
  });

  it('fails a sample when a timestamp read fails rather than publishing zero age', async () => {
    const { queue, client } = createQueue(
      { wait: ['source-upload'], paused: [] },
      {},
    );
    client.hget = async () => {
      throw new Error('Redis unavailable');
    };
    await expect(oldestWaitingTimestamp(queue)).rejects.toThrow(
      'Redis unavailable',
    );
  });
});
