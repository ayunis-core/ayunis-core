import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useExportArtifact } from './useExportArtifact';

const { exportArtifact, client } = vi.hoisted(() => ({
  exportArtifact: vi.fn(),
  client: { track: vi.fn() },
}));

vi.mock('@/shared/api', () => ({ artifactsControllerExport: exportArtifact }));
vi.mock('@/shared/lib/openpanel', () => ({ openPanel: client }));
vi.mock('@/shared/lib/save-blob-as', () => ({ saveBlobAs: vi.fn() }));
vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderExport() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(
    () =>
      useExportArtifact({
        artifactId: 'artifact-id',
        threadId: 'thread-id',
        title: 'Bescheid',
      }),
    { wrapper },
  ).result;
}

describe('useExportArtifact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exportArtifact.mockResolvedValue(new Blob(['file']));
    client.track.mockResolvedValue(undefined);
  });

  it('sends artifact_exported with the output type and format of each successful export', async () => {
    const result = renderExport();

    await act(async () => {
      await result.current.exportArtifact('pdf');
      await result.current.exportArtifact('csv');
    });

    expect(client.track.mock.calls).toEqual([
      [
        'productive_outcome',
        {
          outcome_type: 'artifact_exported',
          output_type: 'document',
          format: 'pdf',
        },
      ],
      [
        'productive_outcome',
        {
          outcome_type: 'artifact_exported',
          output_type: 'spreadsheet',
          format: 'csv',
        },
      ],
    ]);
  });

  it('sends nothing when the export failed', async () => {
    exportArtifact.mockRejectedValue(new Error('export failed'));
    const result = renderExport();

    await act(async () => {
      await result.current.exportArtifact('docx');
    });

    expect(client.track).not.toHaveBeenCalled();
  });
});
