import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { defaultParseSearch } from '@tanstack/react-router';
import type * as RouterModule from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';
import CreditLimitsSettingsPage from './CreditLimitsSettingsPage';

vi.mock('@/features/credit-limits/api/useCreditLimitQueries', () => ({
  useCreditLimitBudget: () => ({
    hasBudget: true,
    isPending: false,
    isError: false,
  }),
}));
vi.mock(
  '@/pages/admin-settings/credit-limits-settings/api/useCreditLimitDirectory',
  () => ({
    useCreditLimitDirectory: () => ({
      rows: [],
      total: 75,
      defaultLimit: 100,
      isPending: false,
      isError: false,
    }),
  }),
);
vi.mock('@/pages/admin-settings/admin-settings-layout', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/widgets/credit-limit-context/ui/CreditLimitBudget', () => ({
  CreditLimitBudget: () => null,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
    i18n: { language: 'en' },
  }),
}));
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const router = await importOriginal<typeof RouterModule>();
  return {
    ...router,
    useNavigate: () => vi.fn(),
    Link: ({
      to,
      search,
      children,
    }: {
      to: string;
      search: Record<string, unknown>;
      children: ReactNode;
    }) => (
      <a href={`${to}${router.defaultStringifySearch(search)}`}>{children}</a>
    ),
  };
});

describe('CreditLimitsSettingsPage', () => {
  it.each(['teams', 'users'] as const)(
    'titles the %s card and preserves pagination filters',
    (tab) => {
      render(
        <CreditLimitsSettingsPage filters={{ tab, page: 1, search: '123' }} />,
      );
      expect(screen.queryByText('page.description')).toBeNull();
      const card = screen.getByRole('table').closest('[data-slot="card"]');
      expect(card).not.toBeNull();
      expect(card?.querySelector('[data-slot="card-title"]')?.textContent).toBe(
        `table.${tab}Title`,
      );
      expect(card?.contains(screen.getByTestId('credit-limits-search'))).toBe(
        true,
      );
      expect(card?.contains(screen.getByRole('link', { name: '2' }))).toBe(
        true,
      );
      const href = screen
        .getByRole('link', { name: '2' })
        .getAttribute('href')!;
      expect(
        defaultParseSearch(new URL(href, 'https://example.test').search),
      ).toEqual({ tab, page: 2, search: '123' });
    },
  );

  it('shows the default limit per user above the users table only', () => {
    const { unmount } = render(
      <CreditLimitsSettingsPage filters={{ tab: 'users', page: 1 }} />,
    );
    const card = screen.getByTestId('credit-limits-default-user');
    expect(card.textContent).toContain('defaultLimit.title');
    expect(card.textContent).toContain('defaultLimit.value:{"credits":"100"}');
    expect(
      card.compareDocumentPosition(screen.getByRole('table')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    unmount();

    render(<CreditLimitsSettingsPage filters={{ tab: 'teams', page: 1 }} />);
    expect(screen.queryByTestId('credit-limits-default-user')).toBeNull();
  });
});
