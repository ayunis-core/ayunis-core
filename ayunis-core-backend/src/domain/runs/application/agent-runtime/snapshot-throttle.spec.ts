import { SNAPSHOT_DUE, SnapshotThrottle } from './snapshot-throttle';
import {
  EventChannel,
  ManualClock,
  settle,
} from 'src/domain/runs/testing/snapshot-throttle.fixture';

const INTERVAL_MS = 75;

describe('SnapshotThrottle', () => {
  let clock: ManualClock;
  let throttle: SnapshotThrottle;
  let source: EventChannel<string>;

  beforeEach(() => {
    clock = new ManualClock();
    throttle = new SnapshotThrottle(clock, INTERVAL_MS);
    source = new EventChannel<string>();
  });

  it('allows the first snapshot immediately and the next one only after the interval', () => {
    expect(throttle.isDue()).toBe(true);

    throttle.markSent();
    clock.advance(INTERVAL_MS - 1);
    expect(throttle.isDue()).toBe(false);

    clock.advance(1);
    expect(throttle.isDue()).toBe(true);
  });

  it('passes source events through in order and completes with the source', async () => {
    const paced = throttle.pace(source, () => false);
    source.push('Guten');
    source.push(' Tag');
    source.end();

    const received: Array<string | typeof SNAPSHOT_DUE> = [];
    for await (const item of paced) received.push(item);

    expect(received).toEqual(['Guten', ' Tag']);
  });

  it('signals a due snapshot when the source stays silent past the interval while one is held', async () => {
    const paced = throttle.pace(source, () => true);
    throttle.markSent();

    const next = paced.next();
    let resolved = false;
    void next.then(() => (resolved = true));
    clock.advance(INTERVAL_MS - 1);
    await settle();
    expect(resolved).toBe(false);

    clock.advance(1);
    expect(await next).toEqual({ value: SNAPSHOT_DUE, done: false });
  });

  it('never signals a due snapshot while nothing is held', async () => {
    const paced = throttle.pace(source, () => false);
    throttle.markSent();

    const next = paced.next();
    clock.advance(INTERVAL_MS * 10);
    source.push('Antwort');

    expect(await next).toEqual({ value: 'Antwort', done: false });
  });

  it('keeps the in-flight read across a due signal so no source event is lost', async () => {
    let holding = true;
    const paced = throttle.pace(source, () => holding);
    throttle.markSent();

    const due = paced.next();
    clock.advance(INTERVAL_MS);
    expect(await due).toEqual({ value: SNAPSHOT_DUE, done: false });

    holding = false;
    source.push('Haushalt');
    expect(await paced.next()).toEqual({ value: 'Haushalt', done: false });
    expect(source.readCount).toBe(1);
  });

  it('closes the source only after its in-flight read settles when the consumer stops early', async () => {
    const paced = throttle.pace(source, () => true);
    throttle.markSent();
    const due = paced.next();
    clock.advance(INTERVAL_MS);
    await due;

    const closing = paced.return(undefined);
    await settle();
    expect(source.closed).toBe(false);

    source.push('verspätet');
    await closing;
    expect(source.closed).toBe(true);
  });

  it('closes the source when the consumer stops between events', async () => {
    const paced = throttle.pace(source, () => false);
    source.push('Bitburg');
    await paced.next();

    await paced.return(undefined);

    expect(source.closed).toBe(true);
  });

  it('propagates a source failure', async () => {
    const paced = throttle.pace(source, () => false);
    source.fail(new Error('runtime crashed'));

    await expect(paced.next()).rejects.toThrow('runtime crashed');
  });
});
