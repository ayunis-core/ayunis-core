import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedApi from '@/shared/api';
import {
  getArtifactsControllerFindByThreadQueryKey,
  getArtifactsControllerFindByWorkspaceQueryKey,
  getArtifactsControllerFindOneQueryKey,
} from '@/shared/api';
import { useUpdateArtifact } from './useUpdateArtifact';

const { updateArtifact, client } = vi.hoisted(() => ({
  updateArtifact: vi.fn(),
  client: { track: vi.fn() },
}));

vi.mock('@/shared/lib/openpanel', () => ({ openPanel: client }));

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof SharedApi>()),
  artifactsControllerUpdate: updateArtifact,
}));

describe('useUpdateArtifact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateArtifact.mockResolvedValue(undefined);
    client.track.mockResolvedValue(undefined);
  });

  it('refreshes the chat and workspace lists that show the artifact without being told which', async () => {
    const queryClient = new QueryClient();
    const listKeys = [
      getArtifactsControllerFindByThreadQueryKey('thread-id'),
      getArtifactsControllerFindByWorkspaceQueryKey('workspace-id', {
        limit: 10,
        offset: 0,
      }),
    ];
    const otherArtifactKey = getArtifactsControllerFindOneQueryKey('other-id');
    [...listKeys, otherArtifactKey].forEach((key) =>
      queryClient.setQueryData(key, []),
    );
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useUpdateArtifact({ artifactId: 'artifact-id' }),
      { wrapper },
    );

    await act(async () => {
      await result.current.updateArtifactAsync({ content: 'updated content' });
    });

    expect(
      listKeys.map((key) => queryClient.getQueryState(key)?.isInvalidated),
    ).toEqual([true, true]);
    expect(queryClient.getQueryState(otherArtifactKey)?.isInvalidated).toBe(
      false,
    );
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
        await result.current.updateArtifactAsync({ content: 'a,b' });
      });

      expect(client.track.mock.calls).toEqual([
        [
          'productive_outcome',
          { outcome_type: 'artifact_edited', output_type: 'spreadsheet' },
        ],
      ]);
    });

    it('is not sent for a letterhead change', async () => {
      const result = renderUpdate('document');

      await act(async () => {
        await result.current.updateArtifactAsync({ letterheadId: null });
      });

      expect(client.track).not.toHaveBeenCalled();
    });

    it('is not sent when saving the version failed', async () => {
      updateArtifact.mockRejectedValue(new Error('save failed'));
      const result = renderUpdate('document');

      await act(async () => {
        await result.current
          .updateArtifactAsync({ content: '<p>Edit</p>' })
          .catch(() => undefined);
      });

      expect(client.track).not.toHaveBeenCalled();
    });
  });
});
