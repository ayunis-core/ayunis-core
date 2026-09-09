import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArtifactResponseDto } from '@/shared/api';
import { ArtifactListSidePanel } from './ArtifactListSidePanel';

const mocks = vi.hoisted(() => ({
  useThreadArtifacts: vi.fn(),
}));

vi.mock('@/pages/chat/api/useThreadArtifacts', () => ({
  useThreadArtifacts: mocks.useThreadArtifacts,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const artifacts = [
  artifact('document', 'Document'),
  artifact('spreadsheet', 'Table'),
  artifact('diagram', 'Diagram'),
];

describe('ArtifactListSidePanel', () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useThreadArtifacts.mockReturnValue({
      artifacts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('lists every artifact with an icon matching its type', () => {
    render(<ArtifactListSidePanel threadId="thread-id" onSelect={onSelect} />);

    expect(screen.getByText('Document')).toBeTruthy();
    expect(screen.getByText('Table')).toBeTruthy();
    expect(screen.getByText('Diagram')).toBeTruthy();
    expect(screen.getByTestId('artifact-type-icon-document')).toBeTruthy();
    expect(screen.getByTestId('artifact-type-icon-spreadsheet')).toBeTruthy();
    expect(screen.getByTestId('artifact-type-icon-diagram')).toBeTruthy();
  });

  it('opens a selected artifact in the same panel', () => {
    render(<ArtifactListSidePanel threadId="thread-id" onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId('artifact-list-item-document'));

    expect(onSelect).toHaveBeenCalledWith('document');
  });

  it('shows the artifact-list empty state', () => {
    mocks.useThreadArtifacts.mockReturnValue({
      artifacts: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ArtifactListSidePanel threadId="thread-id" onSelect={onSelect} />);

    expect(screen.getByText('chat.artifactPanel.emptyTitle')).toBeTruthy();
  });
});

function artifact(
  type: ArtifactResponseDto['type'],
  title: string,
): ArtifactResponseDto {
  return {
    id: type,
    type,
    threadId: 'thread-id',
    userId: 'user-id',
    title,
    currentVersionNumber: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}
