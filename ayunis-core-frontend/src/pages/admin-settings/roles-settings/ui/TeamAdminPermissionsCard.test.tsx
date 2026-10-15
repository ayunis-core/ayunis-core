import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TeamAdminPermissionsCard } from './TeamAdminPermissionsCard';

interface QueryState {
  data?: { permissions: string[] };
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const mocks = vi.hoisted(() => {
  const query: QueryState = {
    data: { permissions: ['team_manage_members', 'team_appoint_admins'] },
    isLoading: false,
    isError: false,
    refetch: () => undefined,
  };
  return { save: vi.fn(), query };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/api', () => ({
  useTeamAdminPermissionsControllerGet: () => mocks.query,
}));
vi.mock(
  '@/pages/admin-settings/roles-settings/api/useUpdateTeamAdminPermissions',
  () => ({
    useUpdateTeamAdminPermissions: () => ({
      save: mocks.save,
      isSaving: false,
    }),
  }),
);

afterEach(() => {
  cleanup();
  mocks.save.mockReset();
});

describe('TeamAdminPermissionsCard', () => {
  it('lists the team admin rights with the last-admin note', () => {
    render(<TeamAdminPermissionsCard />);

    expect(
      screen.getByRole('checkbox', { name: 'team_manage_members-teamAdmin' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('checkbox', { name: 'team_appoint_admins-teamAdmin' }),
    ).toBeTruthy();
    expect(screen.getByText('teamAdmins.note')).toBeTruthy();
  });

  it('saves the changed set only after a change', () => {
    render(<TeamAdminPermissionsCard />);
    const save = screen.getByTestId('team-admin-permissions-save');

    expect(save.hasAttribute('disabled')).toBe(true);

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'team_appoint_admins-teamAdmin' }),
    );
    fireEvent.click(save);

    expect([...(mocks.save.mock.calls[0][0] as Set<string>)]).toEqual([
      'team_manage_members',
    ]);
  });

  it('offers no save when the rights could not be loaded', () => {
    const loaded = mocks.query;
    mocks.query = { ...loaded, data: undefined, isError: true };

    render(<TeamAdminPermissionsCard />);

    expect(screen.getByText('loadError')).toBeTruthy();
    expect(screen.queryByTestId('team-admin-permissions-save')).toBeNull();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    mocks.query = loaded;
  });
});
