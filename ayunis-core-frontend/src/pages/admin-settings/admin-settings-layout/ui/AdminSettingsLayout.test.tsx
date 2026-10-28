import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SettingsLayout from './AdminSettingsLayout';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/layouts/app-layout/ui/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/layouts/content-area-layout/ui/ContentAreaLayout', () => ({
  default: ({
    contentHeader,
    contentArea,
  }: {
    contentHeader: ReactNode;
    contentArea: ReactNode;
  }) => (
    <>
      {contentHeader}
      {contentArea}
    </>
  ),
}));
vi.mock('./AdminSettingsSidebar', () => ({ AdminSettingsSidebar: () => null }));
vi.mock('@ayunis/ui/components/sidebar', () => ({
  SidebarTrigger: () => null,
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

afterEach(cleanup);

describe('admin settings breadcrumbs', () => {
  it('links back to the policy tab with its search preserved', () => {
    render(
      <SettingsLayout
        breadcrumbs={[
          { label: 'Models', href: '/admin-settings/models' },
          {
            label: 'Teams',
            href: '/admin-settings/models?tab=teams&search=Finance',
          },
          { label: 'Finance' },
        ]}
      >
        <p>Team configuration</p>
      </SettingsLayout>,
    );
    expect(
      screen.getByRole('link', { name: 'Teams' }).getAttribute('href'),
    ).toBe('/admin-settings/models?tab=teams&search=Finance');
    expect(
      screen.getByRole('link', { name: 'Models' }).getAttribute('href'),
    ).toBe('/admin-settings/models');
    expect(screen.getByText('Finance').getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('keeps existing single-title pages unchanged', () => {
    render(
      <SettingsLayout title="Users">
        <p>User directory</p>
      </SettingsLayout>,
    );
    expect(screen.getByText('Users').getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('navigation').querySelector('a')).toBeNull();
  });
});
