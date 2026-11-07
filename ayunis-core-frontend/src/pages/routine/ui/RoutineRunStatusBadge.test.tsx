import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Routine } from '@/features/routines';
import { RoutineRunStatusBadge } from './RoutineRunStatusBadge';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

function renderBadge(lastRunStatus: Routine['lastRunStatus']) {
  render(<RoutineRunStatusBadge routine={{ lastRunStatus }} />);
  return screen.getByTestId('routine-header-status');
}

describe('RoutineRunStatusBadge', () => {
  it.each([
    ['queued', 'status.queued'],
    ['running', 'status.running'],
  ] as const)('shows a spinner while %s', (status, label) => {
    const badge = renderBadge(status);

    expect(badge.dataset.status).toBe(status);
    expect(badge.textContent).toBe(label);
    expect(badge.querySelector('.animate-spin')).not.toBeNull();
  });

  it('marks a failed run as destructive', () => {
    const badge = renderBadge('failed');

    expect(badge.dataset.status).toBe('failed');
    expect(badge.dataset.variant).toBe('destructive');
    expect(badge.textContent).toBe('status.failed');
  });

  it.each(['succeeded', 'skipped'] as const)(
    'shows a %s run as secondary',
    (status) => {
      const badge = renderBadge(status);

      expect(badge.dataset.variant).toBe('secondary');
      expect(badge.querySelector('.animate-spin')).toBeNull();
    },
  );

  it('says when the routine has not run yet', () => {
    const badge = renderBadge(null);

    expect(badge.dataset.status).toBe('never');
    expect(badge.textContent).toBe('status.never');
  });
});
