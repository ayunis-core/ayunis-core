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
  useTranslation: () => ({ t: (key: string) => key }),
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
});
