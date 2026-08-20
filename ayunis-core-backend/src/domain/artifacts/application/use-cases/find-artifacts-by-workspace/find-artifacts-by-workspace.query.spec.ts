import type { UUID } from 'crypto';
import { FindArtifactsByWorkspaceQuery } from './find-artifacts-by-workspace.query';

describe('FindArtifactsByWorkspaceQuery', () => {
  const workspaceId = '223e4567-e89b-12d3-a456-426614174000' as UUID;

  it('trims search terms before they reach the repository', () => {
    const query = new FindArtifactsByWorkspaceQuery({
      workspaceId,
      search: '  project brief  ',
    });

    expect(query.search).toBe('project brief');
  });

  it('omits whitespace-only search terms', () => {
    const query = new FindArtifactsByWorkspaceQuery({
      workspaceId,
      search: '   ',
    });

    expect(query.search).toBeUndefined();
  });
});
