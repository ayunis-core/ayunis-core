import { Subject } from 'rxjs';
import { observableToBufferedAsyncIterable } from './buffered-stream.helper';

describe('observableToBufferedAsyncIterable', () => {
  it('yields every emitted value and records it in the buffer', async () => {
    const source$ = new Subject<number>();
    const buffer: number[] = [];
    const onComplete = jest.fn();
    const iterable = observableToBufferedAsyncIterable(
      source$,
      buffer,
      onComplete,
    );

    const consumed: number[] = [];
    const consumer = (async () => {
      for await (const value of iterable) {
        consumed.push(value);
      }
    })();

    source$.next(1);
    source$.next(2);
    source$.complete();
    await consumer;

    expect(consumed).toEqual([1, 2]);
    expect(buffer).toEqual([1, 2]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes from the source when the consumer breaks out early', async () => {
    const source$ = new Subject<number>();
    const buffer: number[] = [];
    const onComplete = jest.fn();
    const iterable = observableToBufferedAsyncIterable(
      source$,
      buffer,
      onComplete,
    );

    const consumer = (async () => {
      for await (const value of iterable) {
        if (value === 1) {
          break;
        }
      }
    })();

    source$.next(1);
    await consumer;

    // A break must release the subscription — otherwise an aborted client
    // keeps the provider stream buffering for the rest of the generation.
    expect(source$.observed).toBe(false);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('propagates source errors and unsubscribes', async () => {
    const source$ = new Subject<number>();
    const buffer: number[] = [];
    const iterable = observableToBufferedAsyncIterable(
      source$,
      buffer,
      jest.fn(),
    );

    const consumer = (async () => {
      const values: number[] = [];
      for await (const value of iterable) {
        values.push(value);
      }
      return values;
    })();

    source$.next(1);
    source$.error(new Error('provider failed'));

    await expect(consumer).rejects.toThrow('provider failed');
    expect(source$.observed).toBe(false);
  });
});
