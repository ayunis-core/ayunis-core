import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CreditLimitsTable } from './CreditLimitsTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('@/widgets/credit-limit-editor/ui/CreditLimitDialog', () => ({
  CreditLimitDialog: ({
    target,
    id,
    name,
    initialLimit,
    onClose,
  }: {
    target: string;
    id: string;
    name: string;
    initialLimit: number | null;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label={name} data-target={target} data-id={id}>
      <input aria-label="monthlyCredits" value={initialLimit ?? ''} readOnly />
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
}));
const rows = [
  { id: 'alice', name: 'Alice', email: 'alice@example.test', limit: null },
  { id: 'bob', name: 'Bob', limit: { monthlyCredits: 0, creditsUsed: 0 } },
];
const filters = { tab: 'users' as const, page: 2, search: 'a' };

describe('CreditLimitsTable', () => {
  it.each(['users', 'teams'] as const)(
    'opens a value dialog without navigation for %s',
    (tab) => {
      render(
        <CreditLimitsTable
          rows={rows}
          filters={{ ...filters, tab }}
          isPending={false}
          isError={false}
        />,
      );
      expect(
        screen.getByText('table.actions').classList.contains('sr-only'),
      ).toBe(true);
      const target = tab === 'users' ? 'user' : 'team';
      const action = screen.getByTestId(`credit-limits-${target}-alice`);
      expect(action.tagName).toBe('BUTTON');
      expect(action.getAttribute('data-slot')).toBe('button');
      fireEvent.click(action);
      const dialog = screen.getByRole('dialog', { name: 'Alice' });
      expect(dialog.getAttribute('data-target')).toBe(tab);
      expect(dialog.getAttribute('data-id')).toBe('alice');
      expect(
        screen
          .getByRole('textbox', { name: 'monthlyCredits' })
          .getAttribute('value'),
      ).toBe('');
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByText('Alice')).toBeTruthy();
    },
  );

  it('keeps the row compact with only the target, its limit and the action', () => {
    render(
      <CreditLimitsTable
        rows={rows}
        filters={filters}
        isPending={false}
        isError={false}
      />,
    );
    expect(
      screen.getAllByRole('columnheader').map((h) => h.textContent),
    ).toEqual(['tabs.users', 'table.limit', 'table.actions']);
    expect(
      screen.getAllByTestId('credit-limits-row-bob')[0].querySelectorAll('td'),
    ).toHaveLength(3);
    expect(screen.queryByText('table.used')).toBeNull();
    expect(screen.queryByText('table.usageUnavailable')).toBeNull();
  });

  it('shows no limit and zero distinctly and opens a zero limit for editing', () => {
    render(
      <CreditLimitsTable
        rows={rows}
        filters={filters}
        isPending={false}
        isError={false}
      />,
    );
    expect(screen.getByText('form.noLimit')).toBeTruthy();
    expect(screen.getByText('table.blocked')).toBeTruthy();
    fireEvent.click(screen.getByTestId('credit-limits-user-bob'));
    expect(screen.getByRole('dialog', { name: 'Bob' })).toBeTruthy();
    expect(
      screen
        .getByRole('textbox', { name: 'monthlyCredits' })
        .getAttribute('value'),
    ).toBe('0');
  });

  it.each([
    { isPending: true, isError: false, text: 'states.loading' },
    { isPending: false, isError: true, text: 'states.error' },
  ])(
    'never presents incomplete data as no limit: $text',
    ({ isPending, isError, text }) => {
      render(
        <CreditLimitsTable
          rows={rows}
          filters={filters}
          isPending={isPending}
          isError={isError}
        />,
      );
      expect(screen.getByText(text)).toBeTruthy();
      expect(screen.queryByText('form.noLimit')).toBeNull();
      expect(screen.queryByText('Alice')).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'table.configure' }),
      ).toBeNull();
    },
  );
});
