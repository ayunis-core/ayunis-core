import { HostRequestLimiter } from './host-request-limiter';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe('HostRequestLimiter', () => {
  it('lets a third request to the same host wait while other hosts go ahead', async () => {
    const limiter = new HostRequestLimiter(2);
    const started: string[] = [];
    const gates = [deferred(), deferred(), deferred(), deferred()];
    const run = (host: string, index: number) =>
      limiter.run(host, async () => {
        started.push(`${host}#${index}`);
        await gates[index].promise;
      });

    const requests = [
      run('a.example', 0),
      run('a.example', 1),
      run('a.example', 2),
      run('b.example', 3),
    ];
    await new Promise((resolve) => setImmediate(resolve));
    expect(started).toEqual(['a.example#0', 'a.example#1', 'b.example#3']);

    gates[0].resolve();
    await requests[0];
    await new Promise((resolve) => setImmediate(resolve));
    expect(started).toContain('a.example#2');

    gates.forEach((gate) => gate.resolve());
    await Promise.all(requests);
  });
});
