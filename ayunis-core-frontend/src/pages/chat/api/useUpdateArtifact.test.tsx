import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateArtifact } from './useUpdateArtifact';

const { updateArtifact } = vi.hoisted(() => ({
  updateArtifact: vi.fn(),
}));

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
});
