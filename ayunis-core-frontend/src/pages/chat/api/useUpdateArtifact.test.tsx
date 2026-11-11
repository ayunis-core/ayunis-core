import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateArtifact } from './useUpdateArtifact';

const { updateArtifact, client } = vi.hoisted(() => ({
  updateArtifact: vi.fn(),
  client: { track: vi.fn() },
}));

vi.mock('@/shared/lib/openpanel', () => ({ openPanel: client }));

vi.mock('@/shared/api', () => ({
  artifactsControllerUpdate: updateArtifact,
  getArtifactsControllerFindOneQueryKey: (artifactId: string) => [
    'artifact',
    artifactId,
  ],
  getArtifactsControllerFindByThreadQueryKey: (threadId: string) => [
    'thread-artifacts',
    threadId,
  ],
  getArtifactsControllerFindByWorkspaceQueryKey: (workspaceId: string) => [
    'workspace-artifacts',
    workspaceId,
  ],
}));

describe('useUpdateArtifact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateArtifact.mockResolvedValue(undefined);
    client.track.mockResolvedValue(undefined);
  });

  it('invalidates the workspace artifact list after updating an artifact', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () =>
        useUpdateArtifact({
          artifactId: 'artifact-id',
          threadId: 'thread-id',
          workspaceId: 'workspace-id',
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.updateArtifactAsync({
        content: 'updated content',
        authorType: 'USER',
      });
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['workspace-artifacts', 'workspace-id'],
    });
  });

  describe('artifact_edited', () => {
    function renderUpdate(artifactType: 'document' | 'spreadsheet') {
      const queryClient = new QueryClient();
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
      return renderHook(
        () =>
          useUpdateArtifact({
            artifactId: 'artifact-id',
            threadId: 'thread-id',
            artifactType,
          }),
        { wrapper },
      ).result;
    }

    it('is sent once a user-authored version was saved', async () => {
      const result = renderUpdate('spreadsheet');

      await act(async () => {
        await result.current.updateArtifactAsync({
          content: 'a,b',
          authorType: 'USER',
        });
      });

      expect(client.track.mock.calls).toEqual([
        [
          'productive_outcome',
          { outcome_type: 'artifact_edited', output_type: 'spreadsheet' },
        ],
      ]);
    });

    it('is not sent for an AI-authored version or a letterhead change', async () => {
      const result = renderUpdate('document');

      await act(async () => {
        await result.current.updateArtifactAsync({
          content: '<p>AI</p>',
          authorType: 'ASSISTANT',
        });
        await result.current.updateArtifactAsync({ letterheadId: null });
      });

      expect(client.track).not.toHaveBeenCalled();
    });

    it('is not sent when saving the version failed', async () => {
      updateArtifact.mockRejectedValue(new Error('save failed'));
      const result = renderUpdate('document');

      await act(async () => {
        await result.current
          .updateArtifactAsync({ content: '<p>Edit</p>', authorType: 'USER' })
          .catch(() => undefined);
      });

      expect(client.track).not.toHaveBeenCalled();
    });
  });
});
