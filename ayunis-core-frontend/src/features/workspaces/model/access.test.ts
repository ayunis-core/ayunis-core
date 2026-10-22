import { describe, expect, it } from 'vitest';
import {
  canEditWorkspace,
  canManageWorkspace,
  isWorkspaceOwner,
} from './access';

describe('workspace access helpers', () => {
  it('lets everyone above "Kann verwenden" edit', () => {
    expect(
      ['owner', 'full', 'edit'].every((level) =>
        canEditWorkspace(level as 'owner' | 'full' | 'edit'),
      ),
    ).toBe(true);
    expect(canEditWorkspace('use')).toBe(false);
  });

  it('lets only owners and "Vollzugriff" manage', () => {
    expect(canManageWorkspace('owner')).toBe(true);
    expect(canManageWorkspace('full')).toBe(true);
    expect(canManageWorkspace('edit')).toBe(false);
    expect(isWorkspaceOwner('full')).toBe(false);
  });
});
