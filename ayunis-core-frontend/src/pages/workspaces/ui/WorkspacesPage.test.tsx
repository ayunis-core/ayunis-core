import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WorkspacesPage from './WorkspacesPage';

const mocks = vi.hoisted(() => ({ granted: ['create_workspaces'] }));

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
    default: ({
      header,
      children,
    }: {
      header: ReactNode;
      children: ReactNode;
    }) => (
      <>
        {header}
        {children}
      </>
    ),
  }),
);

vi.mock('@/widgets/content-area-header/ui/ContentAreaHeader', () => ({
  default: ({ action }: { action: ReactNode }) => <>{action}</>,
}));

vi.mock('@/widgets/create-workspace-dialog', () => ({
  CreateWorkspaceDialog: () => null,
}));

vi.mock('@/widgets/onboarding', () => ({
  OnboardingTourTarget: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
  TOUR_TARGET: { createWorkspace: 'create-workspace' },
}));

vi.mock('@/shared/ui/help-link/HelpLink', () => ({
  HelpLink: () => null,
}));

afterEach(() => {
  cleanup();
  mocks.granted = ['create_workspaces'];
});

function renderEmptyPage() {
  render(
    <WorkspacesPage
      workspaces={[]}
      pagination={{ total: 0, limit: 20, offset: 0 }}
      currentPage={1}
    />,
  );
}

describe('WorkspacesPage creation', () => {
  it('invites members who may create workspaces to add one', () => {
    renderEmptyPage();

    expect(screen.getAllByTestId('workspaces-create').length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText('page.emptyDescription')).toBeTruthy();
  });

  it('hides creation from members without create_workspaces', () => {
    mocks.granted = [];
    renderEmptyPage();

    expect(screen.queryByTestId('workspaces-create')).toBeNull();
    expect(screen.getByText('page.emptyDescriptionNoCreate')).toBeTruthy();
  });
});
