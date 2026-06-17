import { describe, expect, it } from 'vitest';

import { RunContext } from './run-context';

describe('RunContext', () => {
  it('creates a root context with depth 0 and a single-entry path', () => {
    const context = RunContext.create();

    expect(context.depth).toBe(0);
    expect(context.path).toEqual([context.runId]);
  });

  it('stores initial values and reads them back', () => {
    const context = RunContext.create({ orgId: 'org-1', userId: 'user-1' });

    expect(context.get<string>('orgId')).toBe('org-1');
    expect(context.get<string>('userId')).toBe('user-1');
    expect(context.has('orgId')).toBe(true);
  });

  it('returns undefined for unknown keys', () => {
    const context = RunContext.create();

    expect(context.get('missing')).toBeUndefined();
    expect(context.has('missing')).toBe(false);
  });

  it('supports symbol keys', () => {
    const key = Symbol('masks');
    const context = RunContext.create();
    context.set(key, ['a', 'b']);

    expect(context.get<string[]>(key)).toEqual(['a', 'b']);
  });

  it('overwrites values on set', () => {
    const context = RunContext.create({ count: 1 });
    context.set('count', 2);

    expect(context.get<number>('count')).toBe(2);
  });

  it('isolates values between independent contexts', () => {
    const a = RunContext.create({ tenant: 'a' });
    const b = RunContext.create({ tenant: 'b' });

    expect(a.get('tenant')).toBe('a');
    expect(b.get('tenant')).toBe('b');
    expect(a.runId).not.toBe(b.runId);
  });

  describe('deriveChild', () => {
    it('increments depth and extends the path', () => {
      const parent = RunContext.create();
      const child = parent.deriveChild();
      const grandchild = child.deriveChild();

      expect(child.depth).toBe(1);
      expect(child.path).toEqual([parent.runId, child.runId]);
      expect(grandchild.depth).toBe(2);
      expect(grandchild.path).toEqual([
        parent.runId,
        child.runId,
        grandchild.runId,
      ]);
    });

    it('reads parent values through the child', () => {
      const parent = RunContext.create({ orgId: 'org-1' });
      const child = parent.deriveChild();

      expect(child.get<string>('orgId')).toBe('org-1');
      expect(child.has('orgId')).toBe(true);
    });

    it('keeps child writes local to the child', () => {
      const parent = RunContext.create({ orgId: 'org-1' });
      const child = parent.deriveChild();
      child.set('masks', ['m1']);

      expect(child.get<string[]>('masks')).toEqual(['m1']);
      expect(parent.get('masks')).toBeUndefined();
      expect(parent.has('masks')).toBe(false);
    });

    it('shadows parent values without mutating the parent', () => {
      const parent = RunContext.create({ orgId: 'org-1' });
      const child = parent.deriveChild();
      child.set('orgId', 'org-2');

      expect(child.get<string>('orgId')).toBe('org-2');
      expect(parent.get<string>('orgId')).toBe('org-1');
    });

    it('sees parent writes made after derivation (read-through)', () => {
      const parent = RunContext.create();
      const child = parent.deriveChild();
      parent.set('lateValue', 42);

      expect(child.get<number>('lateValue')).toBe(42);
    });
  });
});
