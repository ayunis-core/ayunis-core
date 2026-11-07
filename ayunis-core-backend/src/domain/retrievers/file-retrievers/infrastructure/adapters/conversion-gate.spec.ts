import { ConversionGate } from './conversion-gate';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe(ConversionGate.name, () => {
  it('starts a queued task only after a running one finishes, in arrival order', async () => {
    const gate = new ConversionGate(1);
    const first = deferred<string>();
    const started: string[] = [];
    const run = (name: string, result: Promise<string>) =>
      gate.run(() => {
        started.push(name);
        return result;
      });

    const a = run('a', first.promise);
    const b = run('b', Promise.resolve('b'));
    const c = run('c', Promise.resolve('c'));
    await Promise.resolve();
    expect(started).toEqual(['a']);

    first.resolve('a');
    await expect(Promise.all([a, b, c])).resolves.toEqual(['a', 'b', 'c']);
    expect(started).toEqual(['a', 'b', 'c']);
  });

  it('releases the slot when a task fails', async () => {
    const gate = new ConversionGate(1);

    await expect(
      gate.run(() => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    await expect(gate.run(() => Promise.resolve('next'))).resolves.toBe('next');
  });

  it('runs up to the limit at once', async () => {
    const gate = new ConversionGate(2);
    const hold = deferred<void>();
    const started: number[] = [];
    const tasks = [1, 2, 3].map((n) =>
      gate.run(() => {
        started.push(n);
        return hold.promise;
      }),
    );
    await Promise.resolve();
    expect(started).toEqual([1, 2]);

    hold.resolve();
    await Promise.all(tasks);
    expect(started).toEqual([1, 2, 3]);
  });

  it('rejects a limit below one', () => {
    expect(() => new ConversionGate(0)).toThrow('positive integer');
  });
});
