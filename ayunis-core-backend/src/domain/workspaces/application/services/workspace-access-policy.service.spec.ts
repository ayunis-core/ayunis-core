import type { UUID } from 'crypto';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { WorkspaceAccessPolicyService } from './workspace-access-policy.service';

const TEAM_A_ID = '10000000-0000-4000-8000-000000000001' as UUID;
const TEAM_B_ID = '10000000-0000-4000-8000-000000000002' as UUID;

describe('WorkspaceAccessPolicyService', () => {
  const policy = new WorkspaceAccessPolicyService();
  it('gives the owner immutable full access', () => {
    expect(policy.resolve({ isOwner: true })).toEqual({
      role: WorkspaceRole.FULL,
      sources: [{ type: 'owner' }],
    });
  });

  it('does not grant access for a pending direct invitation', () => {
    expect(
      policy.resolve({
        directMembership: {
          role: WorkspaceRole.EDIT,
          status: WorkspaceMemberStatus.PENDING,
        },
      }),
    ).toBeNull();
  });

  it('grants an active direct membership', () => {
    expect(
      policy.resolve({
        directMembership: {
          role: WorkspaceRole.EDIT,
          status: WorkspaceMemberStatus.ACTIVE,
        },
      }),
    ).toEqual({
      role: WorkspaceRole.EDIT,
      sources: [{ type: 'direct' }],
    });
  });

  it('uses a team member role override', () => {
    expect(
      policy.resolve({
        teamGrants: [
          {
            teamId: TEAM_A_ID,
            role: WorkspaceRole.USE,
            override: { role: WorkspaceRole.FULL, excluded: false },
          },
        ],
      }),
    ).toEqual({
      role: WorkspaceRole.FULL,
      sources: [{ type: 'team', teamId: TEAM_A_ID }],
    });
  });

  it('excludes only the specified team grant', () => {
    expect(
      policy.resolve({
        teamGrants: [
          {
            teamId: TEAM_A_ID,
            role: WorkspaceRole.FULL,
            override: { role: null, excluded: true },
          },
          { teamId: TEAM_B_ID, role: WorkspaceRole.EDIT },
        ],
      }),
    ).toEqual({
      role: WorkspaceRole.EDIT,
      sources: [{ type: 'team', teamId: TEAM_B_ID }],
    });
  });

  it('keeps direct access when a team grant is excluded', () => {
    expect(
      policy.resolve({
        directMembership: {
          role: WorkspaceRole.USE,
          status: WorkspaceMemberStatus.ACTIVE,
        },
        teamGrants: [
          {
            teamId: TEAM_A_ID,
            role: WorkspaceRole.FULL,
            override: { role: null, excluded: true },
          },
        ],
      }),
    ).toEqual({
      role: WorkspaceRole.USE,
      sources: [{ type: 'direct' }],
    });
  });

  it('uses the highest role while retaining every access source', () => {
    expect(
      policy.resolve({
        directMembership: {
          role: WorkspaceRole.USE,
          status: WorkspaceMemberStatus.ACTIVE,
        },
        teamGrants: [{ teamId: TEAM_A_ID, role: WorkspaceRole.FULL }],
        organizationVisible: true,
      }),
    ).toEqual({
      role: WorkspaceRole.FULL,
      sources: [
        { type: 'direct' },
        { type: 'team', teamId: TEAM_A_ID },
        { type: 'organization' },
      ],
    });
  });

  it('compares workspace roles by privilege', () => {
    expect(policy.hasMinimumRole(WorkspaceRole.EDIT, WorkspaceRole.USE)).toBe(
      true,
    );
    expect(policy.hasMinimumRole(WorkspaceRole.USE, WorkspaceRole.EDIT)).toBe(
      false,
    );
  });

  it('grants use access through organization visibility', () => {
    expect(policy.resolve({ organizationVisible: true })).toEqual({
      role: WorkspaceRole.USE,
      sources: [{ type: 'organization' }],
    });
  });
});
