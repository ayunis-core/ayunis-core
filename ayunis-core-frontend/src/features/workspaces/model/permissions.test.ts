import { describe, expect, it } from 'vitest';
import { canEditWorkspace, canShareWorkspace } from './permissions';

describe('workspace role permissions', () => {
  it.each([
    ['use', false, false],
    ['edit', true, false],
    ['full', true, true],
  ] as const)('%s maps to edit=%s and share=%s', (role, edit, share) => {
    expect(canEditWorkspace(role)).toBe(edit);
    expect(canShareWorkspace(role)).toBe(share);
  });
});
