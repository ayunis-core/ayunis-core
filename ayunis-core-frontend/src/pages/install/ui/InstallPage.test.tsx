import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InstallPage from './InstallPage';

const mocks = vi.hoisted(() => ({
  granted: ['install_marketplace_skills'],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/features/permissions', () => ({
  useMyPermissions: () => ({
    can: (permission: string) => mocks.granted.includes(permission),
    isLoading: false,
  }),
}));

vi.mock('@/layouts/app-layout', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock(
  '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout',
  () => ({
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
  }),
);

vi.mock('@/pages/install/api/useFetchMarketplaceSkill', () => ({
  useMarketplaceControllerGetSkill: () => ({
    data: { identifier: 'protokoll', name: 'Protokoll' },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/pages/install/api/useInstallFromMarketplace', () => ({
  useInstallFromMarketplace: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('./InstallSkillCard', () => ({
  InstallSkillCard: () => <div data-testid="install-skill-card" />,
}));

vi.mock('./InstallErrorState', () => ({
  InstallErrorState: ({ title }: { title: string }) => (
    <div data-testid="install-error">{title}</div>
  ),
}));

afterEach(() => {
  cleanup();
  mocks.granted = ['install_marketplace_skills'];
});

describe('InstallPage', () => {
  it('offers the install to members who may install marketplace skills', () => {
    render(<InstallPage skillIdentifier="protokoll" />);

    expect(screen.getByTestId('install-skill-card')).toBeTruthy();
  });

  it('explains the missing permission instead of offering the install', () => {
    mocks.granted = ['manage_own_skills'];
    render(<InstallPage skillIdentifier="protokoll" />);

    expect(screen.queryByTestId('install-skill-card')).toBeNull();
    expect(screen.getByTestId('install-error').textContent).toBe(
      'error.noPermission.title',
    );
  });
});
