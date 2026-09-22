export class IdleTimeoutError extends Error {
  constructor(readonly idleTimeoutMs: number) {
    super(`Model provider stream was idle for ${idleTimeoutMs}ms`);
  }
}

type CallAbortSource = 'external' | 'hook' | 'idle' | 'consumer';

export class ModelCallScope {
  readonly controller = new AbortController();
  private idleTimer?: ReturnType<typeof setTimeout>;
  private abortSource?: CallAbortSource;
  private readonly cleanups: Array<() => void> = [];

  constructor(
    externalSignal: AbortSignal | undefined,
    hookSignal: AbortSignal,
    consumerSignal: AbortSignal,
    private readonly idleTimeoutMs: number,
  ) {
    this.relay(externalSignal, 'external');
    this.relay(hookSignal, 'hook');
    this.relay(consumerSignal, 'consumer');
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get source(): CallAbortSource | undefined {
    return this.abortSource;
  }

  start(): void {
    this.resetIdleTimer();
  }

  notifyChunk(): void {
    this.resetIdleTimer();
  }

  abandon(): void {
    this.abort('consumer', new Error('Run consumer abandoned the model call'));
  }

  async wait<T>(operation: Promise<T>): Promise<T> {
    if (this.signal.aborted) {
      void operation.catch(() => undefined);
      throw abortReason(this.signal.reason);
    }
    return new Promise<T>((resolve, reject) => {
      const onAbort = (): void => reject(abortReason(this.signal.reason));
      this.signal.addEventListener('abort', onAbort, { once: true });
      operation.then(resolve, reject).finally(() => {
        this.signal.removeEventListener('abort', onAbort);
      });
    });
  }

  dispose(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    for (const cleanup of this.cleanups) cleanup();
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.abort('idle', new IdleTimeoutError(this.idleTimeoutMs));
    }, this.idleTimeoutMs);
  }

  private relay(
    signal: AbortSignal | undefined,
    source: CallAbortSource,
  ): void {
    if (!signal) return;
    const onAbort = (): void => this.abort(source, signal.reason);
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    this.cleanups.push(() => signal.removeEventListener('abort', onAbort));
  }

  private abort(source: CallAbortSource, reason: unknown): void {
    if (this.signal.aborted) return;
    this.abortSource = source;
    this.controller.abort(reason);
  }
}

const abortReason = (reason: unknown): Error =>
  reason instanceof Error ? reason : new Error('Model call aborted');
