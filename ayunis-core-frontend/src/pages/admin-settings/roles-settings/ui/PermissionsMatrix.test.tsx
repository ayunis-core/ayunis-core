import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RolePermissionsDraft } from '@/pages/admin-settings/roles-settings/model/types';
import { PermissionsMatrix } from './PermissionsMatrix';

const mocks = vi.hoisted(() => ({ save: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock(
  '@/pages/admin-settings/roles-settings/api/useUpdateRolePermissions',
  () => ({
    useUpdateRolePermissions: () => ({ save: mocks.save, isSaving: false }),
  }),
);

afterEach(() => {
  cleanup();
  mocks.save.mockReset();
});

function serverDraft(): RolePermissionsDraft {
  return {
    user: new Set(['manage_own_skills', 'create_workspaces']),
    manager: new Set(['manage_own_skills', 'assign_users_to_teams']),
  };
}

describe('PermissionsMatrix', () => {
  it('shows the four permission groups in order', () => {
    render(<PermissionsMatrix serverDraft={serverDraft()} />);

    const groups = screen
      .getAllByRole('cell')
      .map((cell) => cell.textContent)
      .filter((text) => text?.startsWith('groups.'));

    expect(groups).toEqual([
      'groups.teams',
      'groups.skills',
      'groups.knowledge_bases',
      'groups.workspaces',
    ]);
  });

  it('marks only the new permissions with a badge', () => {
    render(<PermissionsMatrix serverDraft={serverDraft()} />);

    expect(
      screen.getByTestId('permission-row-create_workspaces').textContent,
    ).toContain('newBadge');
    expect(
      screen.getByTestId('permission-row-manage_own_skills').textContent,
    ).not.toContain('newBadge');
  });

  it('keeps the admin column checked and locked', () => {
    render(<PermissionsMatrix serverDraft={serverDraft()} />);

    const admin = screen.getByRole('checkbox', {
      name: 'create_workspaces-admin',
    });

    expect(admin.getAttribute('data-state')).toBe('checked');
    expect(admin.hasAttribute('disabled')).toBe(true);
  });

  it('saves the edited draft only after a change', () => {
    const draft = serverDraft();
    render(<PermissionsMatrix serverDraft={draft} />);
    const save = screen.getByRole('button', { name: 'save' });

    expect(save.hasAttribute('disabled')).toBe(true);

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'create_workspaces-user' }),
    );
    fireEvent.click(save);

    const [edited, original] = mocks.save.mock.calls[0] as [
      RolePermissionsDraft,
      RolePermissionsDraft,
    ];
    expect(edited.user.has('create_workspaces')).toBe(false);
    expect(original).toBe(draft);
  });
});
