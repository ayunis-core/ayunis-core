import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MeResponseDtoRole } from '@/shared/api';
import { useAuthorization } from './useAuthorization';

const mocks = vi.hoisted(() => ({
  useAuthenticationControllerMe: vi.fn(),
  useMyPermissions: vi.fn(),
  useMyTeams: vi.fn(),
}));

vi.mock('@/shared/api', () => ({
  MeResponseDtoRole: {
    admin: 'admin',
    manager: 'manager',
    user: 'user',
  },
  useAuthenticationControllerMe: mocks.useAuthenticationControllerMe,
}));

vi.mock('./useMyPermissions', () => ({
  useMyPermissions: mocks.useMyPermissions,
}));

vi.mock('./useMyTeams', () => ({
  useMyTeams: mocks.useMyTeams,
}));

describe('useAuthorization', () => {
  beforeEach(() => {
    mocks.useAuthenticationControllerMe.mockReturnValue({
      data: { role: MeResponseDtoRole.manager },
      isLoading: false,
    });
    mocks.useMyPermissions.mockReturnValue({
      permissions: ['manage_teams'],
      isLoading: false,
    });
    mocks.useMyTeams.mockReturnValue({
      teams: [
        {
          id: 'team-a',
          role: 'admin',
          permissions: ['share_skills_with_teams'],
        },
      ],
      isLoading: false,
    });
  });

  it('exposes role and permission checks for the current user', () => {
    const { result } = renderHook(() => useAuthorization());

    expect(result.current.hasRole(MeResponseDtoRole.manager)).toBe(true);
    expect(result.current.can('manage_teams')).toBe(true);
    expect(result.current.canInTeam('team-a', 'share_skills_with_teams')).toBe(
      true,
    );
    expect(result.current.can('share_skills_with_teams')).toBe(false);
  });

  it('stays loading until the team access is available', () => {
    mocks.useMyTeams.mockReturnValue({ teams: [], isLoading: true });

    const { result } = renderHook(() => useAuthorization());

    expect(result.current.isLoading).toBe(true);
  });

  it('stays loading until both user and permission data are available', () => {
    mocks.useMyPermissions.mockReturnValue({
      permissions: [],
      isLoading: true,
    });

    const { result } = renderHook(() => useAuthorization());

    expect(result.current.isLoading).toBe(true);
  });
});
