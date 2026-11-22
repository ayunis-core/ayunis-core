import { describe, expect, it } from 'vitest';
import { canDeleteArtifact } from './can-delete-artifact';

const creator = 'creator-id';
const colleague = 'colleague-id';
const workspaceArtifact = {
  ownerType: 'workspace' as const,
  creatorId: creator,
};

describe('canDeleteArtifact', () => {
  it('offers delete for a personal artifact, which only its owner can open', () => {
    expect(
      canDeleteArtifact({ ownerType: 'personal', creatorId: creator }, creator),
    ).toBe(true);
  });

  it('offers delete to the creator of a workspace artifact without manage_workspace', () => {
    expect(
      canDeleteArtifact(workspaceArtifact, creator, {
        role: 'user',
        permissions: [],
      }),
    ).toBe(true);
  });

  it('hides delete from a member who neither created the workspace artifact nor may manage the workspace', () => {
    expect(
      canDeleteArtifact(workspaceArtifact, colleague, {
        role: 'user',
        permissions: ['manage_workspace_members'],
      }),
    ).toBe(false);
  });

  it('offers delete to a member who may manage the workspace', () => {
    expect(
      canDeleteArtifact(workspaceArtifact, colleague, {
        role: 'manager',
        permissions: ['manage_workspace'],
      }),
    ).toBe(true);
  });

  it('hides delete while the workspace permissions are unknown', () => {
    expect(canDeleteArtifact(workspaceArtifact, colleague)).toBe(false);
  });
});
