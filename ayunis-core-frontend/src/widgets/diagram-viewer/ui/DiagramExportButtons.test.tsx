import { useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArtifactPiiMaskResponseDto } from '@/shared/api';
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

function Diagram({
  rendered,
  label = '',
  fileName = 'Ablauf',
  piiMasks = [],
}: Readonly<{
  rendered: boolean;
  label?: string;
  fileName?: string;
  piiMasks?: ArtifactPiiMaskResponseDto[];
}>) {
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={containerRef}>
        {rendered && (
          <svg>
            <text>{label}</text>
          </svg>
        )}
      </div>
      <DiagramExportButtons
        containerRef={containerRef}
        fileName={fileName}
        piiMasks={piiMasks}
      />
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

  it('exports and names the file with the real values from the artifact’s own dictionary', async () => {
    render(
      <Diagram
        rendered
        label="Antrag von {{pii:PERSON_NAME_1}}"
        fileName="Ablauf {{pii:PERSON_NAME_1}}"
        piiMasks={[
          {
            token: '{{pii:PERSON_NAME_1}}',
            value: 'Anna Schmidt',
            category: 'person_name',
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'diagram.export.svg' }));

    const [[blob, fileName]] = saveBlobAs.mock.calls as [[Blob, string]];
    const svg = await blob.text();
    expect(svg).toContain('Antrag von Anna Schmidt');
    expect(fileName).toBe('Ablauf Anna Schmidt.svg');
    expect(svg).not.toContain('{{pii:');
  });

  it('sends nothing while no diagram is rendered', () => {
    render(<Diagram rendered={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'diagram.export.svg' }));

    expect(saveBlobAs).not.toHaveBeenCalled();
    expect(trackOutcome).not.toHaveBeenCalled();
  });
});
