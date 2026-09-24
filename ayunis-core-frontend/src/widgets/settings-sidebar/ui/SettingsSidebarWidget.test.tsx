import type { PropsWithChildren, ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettingsSidebarWidget } from './SettingsSidebarWidget';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: '/super-admin-settings/orgs' }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock('@ayunis/ui/components/sidebar', () => {
  const Passthrough = ({ children }: PropsWithChildren) => <>{children}</>;

  return {
    Sidebar: Passthrough,
    SidebarContent: Passthrough,
    SidebarFooter: Passthrough,
    SidebarGroup: Passthrough,
    SidebarGroupLabel: Passthrough,
    SidebarHeader: Passthrough,
    SidebarMenu: Passthrough,
    SidebarMenuButton: Passthrough,
    SidebarMenuItem: Passthrough,
  };
});

afterEach(cleanup);

describe(SettingsSidebarWidget.name, () => {
  it('opens an external menu item in a new tab without an opener reference', () => {
    render(
      <SettingsSidebarWidget
        translationNamespace="super-admin-settings-layout"
        groups={[
          {
            labelKey: 'groups.operations',
            items: [
              {
                to: '/api/internal/queues/',
                external: true,
                icon: <span />,
                label: 'layout.queueInspection',
              },
            ],
          },
        ]}
      />,
    );

    const link = screen.getByRole('link', { name: 'layout.queueInspection' });
    expect(link.getAttribute('href')).toBe('/api/internal/queues/');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
