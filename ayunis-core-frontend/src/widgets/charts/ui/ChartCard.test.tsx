import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartCard } from './ChartCard';

const { toPng, trackOutcome } = vi.hoisted(() => ({
  toPng: vi.fn(),
  trackOutcome: vi.fn(),
}));
vi.mock('html-to-image', () => ({ toPng }));
vi.mock('@/shared/lib/openpanel-outcomes', () => ({
  useTrackProductiveOutcome: () => trackOutcome,
}));

describe('ChartCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends visual_downloaded once the chart image download started', async () => {
    toPng.mockResolvedValue('data:image/png;base64,');
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    render(
      <ChartCard title="Anträge" config={{}}>
        <div />
      </ChartCard>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Download chart as image' }),
    );

    await waitFor(() =>
      expect(trackOutcome.mock.calls).toEqual([
        [
          {
            outcome_type: 'visual_downloaded',
            output_type: 'chart',
            format: 'png',
          },
        ],
      ]),
    );
    expect(click).toHaveBeenCalledTimes(1);
  });
});
