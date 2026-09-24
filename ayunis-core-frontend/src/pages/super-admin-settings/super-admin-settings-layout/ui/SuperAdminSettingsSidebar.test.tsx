import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SidebarMenuGroup } from '@/widgets/settings-sidebar/ui/SettingsSidebarWidget';
import { SuperAdminSettingsSidebar } from './SuperAdminSettingsSidebar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/widgets/settings-sidebar/ui/SettingsSidebarWidget', () => ({
  SettingsSidebarWidget: ({ groups }: { groups: SidebarMenuGroup[] }) => (
    <nav>
      {groups.map((group) => (
        <section key={group.labelKey}>
          <h2>{group.labelKey}</h2>
          {group.items.map((item) => (
            <a
              key={item.to}
              href={item.to}
              target={item.external ? '_blank' : undefined}
            >
              {item.label}
            </a>
          ))}
        </section>
      ))}
    </nav>
  ),
}));

afterEach(cleanup);

describe(SuperAdminSettingsSidebar.name, () => {
  it('places queue inspection in the operations group as a new-tab link', () => {
    render(<SuperAdminSettingsSidebar />);

    expect(
      screen.getByRole('heading', { name: 'groups.operations' }),
    ).toBeTruthy();
    const link = screen.getByRole('link', { name: 'layout.queueInspection' });
    expect(link.getAttribute('href')).toBe(
      'http://localhost:3000/api/internal/queues/',
    );
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
