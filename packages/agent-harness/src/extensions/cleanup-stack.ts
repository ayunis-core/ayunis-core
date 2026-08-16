import type { ExtensionCleanup } from '@ayunis/agent-extensions';

export class CleanupStack {
  private cleanups: ExtensionCleanup[] = [];
  private disposed = false;

  add(cleanup: ExtensionCleanup): void {
    if (this.disposed) {
      throw new Error('Cannot add cleanup to a disposed stack.');
    }
    this.cleanups.push(cleanup);
  }

  absorb(stack: CleanupStack): void {
    if (this.disposed) {
      throw new Error('Cannot absorb cleanup into a disposed stack.');
    }
    this.cleanups.push(...stack.release());
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    const failures: unknown[] = [];
    for (const cleanup of this.cleanups.toReversed()) {
      try {
        await cleanup();
      } catch (error) {
        failures.push(error);
      }
    }
    this.cleanups = [];
    if (failures.length > 0) {
      throw new AggregateError(
        failures,
        'One or more extension cleanups failed.',
      );
    }
  }

  private release(): ExtensionCleanup[] {
    if (this.disposed) {
      return [];
    }
    this.disposed = true;
    const released = this.cleanups;
    this.cleanups = [];
    return released;
  }
}
