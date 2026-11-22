import { useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DiagramExportButtons } from './DiagramExportButtons';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const { saveBlobAs, trackOutcome } = vi.hoisted(() => ({
  saveBlobAs: vi.fn(),
  trackOutcome: vi.fn(),
}));
vi.mock('@/shared/lib/save-blob-as', () => ({ saveBlobAs }));
vi.mock('@/shared/lib/openpanel-outcomes', () => ({
  useTrackProductiveOutcome: () => trackOutcome,
}));

function Diagram({ rendered }: Readonly<{ rendered: boolean }>) {
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={containerRef}>{rendered && <svg />}</div>
      <DiagramExportButtons containerRef={containerRef} fileName="Ablauf" />
    </>
  );
}

describe('DiagramExportButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends visual_downloaded once the SVG download started', () => {
    render(<Diagram rendered />);

    fireEvent.click(screen.getByRole('button', { name: 'diagram.export.svg' }));

    expect(saveBlobAs).toHaveBeenCalledTimes(1);
    expect(trackOutcome.mock.calls).toEqual([
      [
        {
          outcome_type: 'visual_downloaded',
          output_type: 'diagram',
          format: 'svg',
        },
      ],
    ]);
  });

  it('sends nothing while no diagram is rendered', () => {
    render(<Diagram rendered={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'diagram.export.svg' }));

    expect(saveBlobAs).not.toHaveBeenCalled();
    expect(trackOutcome).not.toHaveBeenCalled();
  });
});
