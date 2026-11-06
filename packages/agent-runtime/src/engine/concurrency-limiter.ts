/** Runs async tasks with at most `limit` of them in flight, in FIFO order. */
export class ConcurrencyLimiter {
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.waiting.push(resolve));
  }

  // A freed slot passes straight to the next waiter, so a task arriving in
  // between cannot overtake the queue or exceed the limit.
  private release(): void {
    const next = this.waiting.shift();
    if (next) next();
    else this.active--;
  }
}
