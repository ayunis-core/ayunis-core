import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { ArtifactSidePanel } from './ArtifactSidePanel';

const mocks = vi.hoisted(() => ({
  requestEditorExit: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/widgets/artifact-editor', () => ({
  ArtifactEditor: ({
    onBack,
    ref,
  }: {
    onBack: () => void;
    ref: { current: ArtifactPanelHandle | null };
  }) => {
    ref.current = { requestExit: mocks.requestEditorExit };
    return <button onClick={onBack}>editor-back</button>;
  },
}));

vi.mock('@/widgets/diagram-viewer', () => ({
  DiagramViewer: () => null,
}));

vi.mock('@/widgets/spreadsheet-editor', () => ({
  SpreadsheetEditor: () => null,
}));

describe('ArtifactSidePanel', () => {
  const baseProps = {
    onSave: vi.fn(),
    onRevert: vi.fn(),
    onExport: vi.fn(),
    onClose: vi.fn(),
    onBack: vi.fn(),
    onRetry: vi.fn(),
    onLetterheadChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps a closeable panel visible while the artifact is loading', () => {
    render(
      <ArtifactSidePanel {...baseProps} artifact={null} isLoading={true} />,
    );

    expect(screen.getByTestId('artifact-side-panel-loading')).toBeTruthy();
    fireEvent.click(screen.getByTestId('artifact-side-panel-close'));
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('shows a retry and close action when loading the artifact fails', () => {
    render(
      <ArtifactSidePanel
        {...baseProps}
        artifact={null}
        error={new Error('not found')}
      />,
    );

    expect(screen.getByTestId('artifact-side-panel-error')).toBeTruthy();
    fireEvent.click(screen.getByTestId('artifact-side-panel-retry'));
    expect(baseProps.onRetry).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByTestId('artifact-side-panel-close'));
    expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('returns from artifact detail to the artifact list', async () => {
    render(
      <ArtifactSidePanel
        {...baseProps}
        artifact={{
          id: 'artifact-id',
          type: 'document',
          threadId: 'thread-id',
          userId: 'user-id',
          title: 'Document',
          currentVersionNumber: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
      />,
    );

    fireEvent.click(await screen.findByText('editor-back'));
    expect(baseProps.onBack).toHaveBeenCalledOnce();
  });

  it('routes external transitions through the active editor', async () => {
    const ref = createRef<ArtifactPanelHandle>();
    const transition = vi.fn();
    render(
      <ArtifactSidePanel
        ref={ref}
        {...baseProps}
        artifact={{
          id: 'artifact-id',
          type: 'document',
          threadId: 'thread-id',
          userId: 'user-id',
          title: 'Document',
          currentVersionNumber: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }}
      />,
    );

    await screen.findByText('editor-back');
    ref.current?.requestExit(transition);

    expect(mocks.requestEditorExit).toHaveBeenCalledWith(transition);
    expect(transition).not.toHaveBeenCalled();
  });

  it('runs external transitions immediately without an active editor', () => {
    const ref = createRef<ArtifactPanelHandle>();
    const transition = vi.fn();
    render(
      <ArtifactSidePanel
        ref={ref}
        {...baseProps}
        artifact={null}
        isLoading={true}
      />,
    );

    ref.current?.requestExit(transition);

    expect(transition).toHaveBeenCalledOnce();
  });

  it('shows a not-found state without retrying a missing artifact', () => {
    const error = new AxiosError('not found');
    Object.defineProperty(error, 'response', { value: { status: 404 } });

    render(<ArtifactSidePanel {...baseProps} artifact={null} error={error} />);

    expect(screen.getByText('chat.artifactPanel.notFoundTitle')).toBeTruthy();
    expect(screen.queryByTestId('artifact-side-panel-retry')).toBeNull();
  });
});
