import { describe, expect, it, vi } from 'vitest';

import { CleanupStack } from './cleanup-stack';

describe('CleanupStack', () => {
  it('cleans up in reverse order and only once', async () => {
    const order: string[] = [];
    const stack = new CleanupStack();
    stack.add(() => {
      order.push('first');
    });
    stack.add(() => {
      order.push('second');
    });

    await stack.dispose();
    await stack.dispose();

    expect(order).toEqual(['second', 'first']);
  });

  it('runs every cleanup and aggregates failures', async () => {
    const last = vi.fn();
    const stack = new CleanupStack();
    stack.add(() => {
      throw new Error('first failed');
    });
    stack.add(last);
    stack.add(() => {
      throw new Error('last failed');
    });

    const error = await stack.dispose().catch((cause: unknown) => cause);

    expect(last).toHaveBeenCalledOnce();
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toHaveLength(2);
  });

  it('transfers provisional cleanup without running it', async () => {
    const cleanup = vi.fn();
    const owner = new CleanupStack();
    const provisional = new CleanupStack();
    provisional.add(cleanup);

    owner.absorb(provisional);
    await provisional.dispose();
    expect(cleanup).not.toHaveBeenCalled();

    await owner.dispose();
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
