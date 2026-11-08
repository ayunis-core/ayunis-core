/**
 * Bounds the conversions a process keeps in flight. Callers queue here, where
 * no Gotenberg request timeout runs, instead of inside Gotenberg's single
 * LibreOffice queue, where a slow document ahead of them burns their time
 * limit (AYC-1641). Waiters are released in arrival order.
 */
export class ConversionGate {
  private inFlight = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly limit: number) {
    if (!Number.isSafeInteger(limit) || limit < 1)
      throw new Error('Conversion gate limit must be a positive integer');
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.inFlight < this.limit) {
      this.inFlight += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waiting.push(() => {
        this.inFlight += 1;
        resolve();
      });
    });
  }

  private release(): void {
    this.inFlight -= 1;
    this.waiting.shift()?.();
  }
}
