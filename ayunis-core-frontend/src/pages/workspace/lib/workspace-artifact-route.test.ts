import { describe, expect, it } from 'vitest';
import { getWorkspaceArtifactRoute } from './workspace-artifact-route';

describe('getWorkspaceArtifactRoute', () => {
  it('targets the owning chat and preserves the artifact id', () => {
    expect(
      getWorkspaceArtifactRoute({
        id: 'artifact-id',
        threadId: 'thread-id',
      }),
    ).toEqual({
      threadId: 'thread-id',
      artifactId: 'artifact-id',
    });
  });
});
