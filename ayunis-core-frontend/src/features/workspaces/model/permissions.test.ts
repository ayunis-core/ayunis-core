import { describe, expect, it } from 'vitest';
import { canEditWorkspace, canShareWorkspace } from './permissions';

describe('workspace accessLevel permissions', () => {
  it.each([
    ['use', false, false],
    ['edit', true, false],
    ['full', true, true],
  ] as const)('%s maps to edit=%s and share=%s', (accessLevel, edit, share) => {
    expect(canEditWorkspace(accessLevel)).toBe(edit);
    expect(canShareWorkspace(accessLevel)).toBe(share);
  });
});
