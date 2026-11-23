/** At most `limit` operations at once per host, in this process; the rest wait in order. */
export class HostRequestLimiter {
  private readonly active = new Map<string, number>();
  private readonly waiting = new Map<string, Array<() => void>>();

  constructor(private readonly limit: number) {}

  async run<T>(host: string, operation: () => Promise<T>): Promise<T> {
    await this.acquire(host);
    try {
      return await operation();
    } finally {
      this.release(host);
    }
  }

  private acquire(host: string): Promise<void> {
    const active = this.active.get(host) ?? 0;
    if (active < this.limit) {
      this.active.set(host, active + 1);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const queue = this.waiting.get(host) ?? [];
      queue.push(resolve);
      this.waiting.set(host, queue);
    });
  }

  private release(host: string): void {
    const next = this.waiting.get(host)?.shift();
    if (next) {
      next();
      return;
    }
    this.waiting.delete(host);
    const active = (this.active.get(host) ?? 1) - 1;
    if (active > 0) this.active.set(host, active);
    else this.active.delete(host);
  }
}
