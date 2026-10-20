import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { AxiosError } from 'axios';
import { axiosInstance } from '@/shared/api/client';
import { DeployGapBanner } from './DeployGapBanner';

const translations: Record<string, string> = {
  'common.deployGapBanner.title': 'Reconnecting…',
  'common.deployGapBanner.description':
    'Ayunis is restarting after an update. This page continues automatically.',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}));

function respondWith(statuses: number[]) {
  let calls = 0;
  axiosInstance.defaults.adapter = (config) => {
    const status = statuses[Math.min(calls++, statuses.length - 1)];
    const response = {
      data: 'ok',
      status,
      statusText: '',
      headers: {},
      config,
    };
    if (status >= 400) {
      return Promise.reject(
        new AxiosError('failed', undefined, config, undefined, response),
      );
    }
    return Promise.resolve(response);
  };
}

describe(DeployGapBanner.name, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('appears once a mounted page starts retrying through a deploy restart and clears when it recovers', async () => {
    respondWith([502, 200]);
    render(<DeployGapBanner />);
    expect(screen.queryByRole('status')).toBeNull();

    const request = axiosInstance.get('/threads');
    await act(() => vi.advanceTimersByTimeAsync(0));

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Reconnecting…');
    expect(status.textContent).toContain('continues automatically');

    await act(() => vi.runAllTimersAsync());
    await request;
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('stays hidden for failures that are not a deploy restart', async () => {
    respondWith([500]);
    render(<DeployGapBanner />);

    const request = axiosInstance.get('/threads').catch(() => undefined);
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.queryByRole('status')).toBeNull();
    await request;
  });
});
