import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Routine } from '@/features/routines/model/openapi';
import { RoutineScheduleLine } from './RoutineScheduleLine';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function routine(overrides: Partial<Routine>): Routine {
  return {
    id: 'routine-1',
    name: 'Amtsblatt',
    prompt: 'Prüfe das Amtsblatt',
    modelId: null,
    dailyTime: '07:30',
    internetEnabled: false,
    enabled: true,
    lastRunStatus: null,
    lastRunAt: null,
    lastRunFailureReason: null,
    consecutiveFailureCount: 0,
    nextRunAt: '2026-11-08T06:34:00.000Z',
    pausedAt: null,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('RoutineScheduleLine', () => {
  it('shows when an enabled routine runs next', () => {
    render(<RoutineScheduleLine routine={routine({})} />);

    expect(screen.getByTestId('routine-next-run').textContent).toContain(
      'schedule.nextRun',
    );
    expect(screen.queryByTestId('routine-paused')).toBeNull();
  });

  it('shows a routine paused by repeated failures instead of a next run', () => {
    render(
      <RoutineScheduleLine
        routine={routine({
          enabled: false,
          nextRunAt: null,
          consecutiveFailureCount: 3,
          pausedAt: '2026-11-07T06:40:00.000Z',
        })}
      />,
    );

    expect(screen.getByTestId('routine-paused').textContent).toContain(
      'schedule.paused',
    );
    expect(screen.queryByTestId('routine-next-run')).toBeNull();
  });

  it('shows nothing for a routine the user turned off', () => {
    const { container } = render(
      <RoutineScheduleLine
        routine={routine({ enabled: false, nextRunAt: null })}
      />,
    );

    expect(container.innerHTML).toBe('');
  });
});
