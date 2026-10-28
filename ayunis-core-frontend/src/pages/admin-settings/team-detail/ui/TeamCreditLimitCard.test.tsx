import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamCreditLimitCard } from './TeamCreditLimitCard';

const state = vi.hoisted(() => ({
  limits: new Map<string, { monthlyCredits: number; creditsUsed: number }>(),
  isLoading: false,
  isError: false,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('@/pages/admin-settings/team-detail/api/useTeamCreditLimits', () => ({
  useTeamCreditLimits: () => ({
    teamLimits: state.limits,
    isLoading: state.isLoading,
    isError: state.isError,
  }),
}));
vi.mock('@/widgets/credit-limit-editor/ui/CreditLimitDialog', () => ({
  CreditLimitDialog: ({
    name,
    initialLimit,
    onClose,
  }: {
    name: string;
    initialLimit: number | null;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label={name}>
      <input aria-label="amount" value={initialLimit ?? ''} readOnly />
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
}));
beforeEach(() => {
  state.limits.clear();
  state.isLoading = false;
  state.isError = false;
});

describe('TeamCreditLimitCard', () => {
  it('opens the compact modal with the saved zero limit', () => {
    state.limits.set('team', { monthlyCredits: 0, creditsUsed: 0 });
    render(<TeamCreditLimitCard teamId="team" teamName="Finance" />);
    fireEvent.click(screen.getByRole('button', { name: 'table.configure' }));
    expect(screen.getByRole('dialog', { name: 'Finance' })).toBeTruthy();
    expect(
      screen.getByRole('textbox', { name: 'amount' }).getAttribute('value'),
    ).toBe('0');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it.each(['loading', 'error'])(
    'disables configuration when limit state is %s',
    (status) => {
      state.isLoading = status === 'loading';
      state.isError = status === 'error';
      render(<TeamCreditLimitCard teamId="team" teamName="Finance" />);
      expect(
        screen
          .getByRole('button', { name: 'table.configure' })
          .hasAttribute('disabled'),
      ).toBe(true);
    },
  );
});
