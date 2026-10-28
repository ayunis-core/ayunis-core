import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UserLockStatus } from './UserLockStatus';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe(UserLockStatus.name, () => {
  it.each([
    [true, 'status.locked', 'locked'],
    [false, 'status.active', 'active'],
  ])('renders the account status for isLocked=%s', (isLocked, label, state) => {
    render(<UserLockStatus isLocked={isLocked} />);

    const badge = screen.getByTestId('user-lock-status');
    expect(badge.textContent).toBe(label);
    expect(badge.getAttribute('data-state')).toBe(state);
  });
});
