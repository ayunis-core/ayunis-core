import { fireEvent, render, screen } from '@testing-library/react';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArtifactSidePanel } from './ArtifactSidePanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ArtifactSidePanel', () => {
  const baseProps = {
    onSave: vi.fn(),
    onRevert: vi.fn(),
    onExport: vi.fn(),
    onClose: vi.fn(),
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

  it('shows a not-found state without retrying a missing artifact', () => {
    const error = new AxiosError('not found');
    Object.defineProperty(error, 'response', { value: { status: 404 } });

    render(<ArtifactSidePanel {...baseProps} artifact={null} error={error} />);

    expect(screen.getByText('chat.artifactPanel.notFoundTitle')).toBeTruthy();
    expect(screen.queryByTestId('artifact-side-panel-retry')).toBeNull();
  });
});
