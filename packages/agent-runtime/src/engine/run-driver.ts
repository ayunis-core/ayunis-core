export const consumerCloseIterable = <T>(
  createGenerator: (signal: AbortSignal) => AsyncGenerator<T>,
): AsyncIterable<T> => ({
  [Symbol.asyncIterator]() {
    const controller = new AbortController();
    return new ConsumerCloseIterator(
      createGenerator(controller.signal),
      controller,
    );
  },
});

class ConsumerCloseIterator<T> implements AsyncIterableIterator<T> {
  private closed = false;
  private current?: Promise<IteratorResult<T>>;
  private closing?: Promise<IteratorResult<T>>;

  constructor(
    private readonly inner: AsyncGenerator<T>,
    private readonly controller: AbortController,
  ) {}

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return this;
  }

  next(): Promise<IteratorResult<T>> {
    if (this.closed) return Promise.resolve(doneResult());
    if (this.current) {
      return Promise.reject(
        new Error('Concurrent run iterator reads are not supported'),
      );
    }
    const operation = this.inner.next();
    this.current = operation;
    void operation
      .finally(() => {
        if (this.current === operation) this.current = undefined;
      })
      .catch(() => undefined);
    return operation.then((result) => (this.closed ? doneResult() : result));
  }

  return(): Promise<IteratorResult<T>> {
    if (this.closing) return this.closing;
    this.closed = true;
    const pending = this.current;
    this.controller.abort(new Error('Run consumer abandoned the stream'));
    this.closing = this.close(pending);
    return this.closing;
  }

  private async close(
    pending: Promise<IteratorResult<T>> | undefined,
  ): Promise<IteratorResult<T>> {
    let failure: unknown;
    try {
      await pending;
    } catch (error) {
      failure = error;
    }
    try {
      await this.inner.return(undefined);
    } catch (error) {
      failure ??= error;
    }
    if (failure instanceof Error) throw failure;
    if (failure !== undefined) {
      throw new Error('Run finalization failed', { cause: failure });
    }
    return doneResult();
  }
}

const doneResult = <T>(): IteratorResult<T> => ({
  done: true,
  value: undefined,
});
