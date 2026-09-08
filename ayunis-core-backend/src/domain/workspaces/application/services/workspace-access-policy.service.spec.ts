import type { UUID } from 'crypto';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { WorkspaceAccessPolicyService } from './workspace-access-policy.service';

const TEAM_A_ID = '10000000-0000-4000-8000-000000000001' as UUID;
const TEAM_B_ID = '10000000-0000-4000-8000-000000000002' as UUID;

describe('WorkspaceAccessPolicyService', () => {
  const policy = new WorkspaceAccessPolicyService();
  it('gives the owner immutable full access', () => {
    expect(policy.resolve({ isOwner: true })).toEqual({
      accessLevel: WorkspaceAccessLevel.FULL,
      sources: [{ type: 'owner' }],
    });
  });

  it('does not grant access for a pending direct invitation', () => {
    expect(
      policy.resolve({
        directMembership: {
          accessLevel: WorkspaceAccessLevel.EDIT,
          status: WorkspaceMemberStatus.PENDING,
        },
      }),
    ).toBeNull();
  });

  it('grants an active direct membership', () => {
    expect(
      policy.resolve({
        directMembership: {
          accessLevel: WorkspaceAccessLevel.EDIT,
          status: WorkspaceMemberStatus.ACTIVE,
        },
      }),
    ).toEqual({
      accessLevel: WorkspaceAccessLevel.EDIT,
      sources: [{ type: 'direct' }],
    });
  });

  it('uses a team member access level override', () => {
    expect(
      policy.resolve({
        teamGrants: [
          {
            teamId: TEAM_A_ID,
            accessLevel: WorkspaceAccessLevel.USE,
            override: {
              accessLevel: WorkspaceAccessLevel.FULL,
              excluded: false,
            },
          },
        ],
      }),
    ).toEqual({
      accessLevel: WorkspaceAccessLevel.FULL,
      sources: [{ type: 'team', teamId: TEAM_A_ID }],
    });
  });

  it('excludes only the specified team grant', () => {
    expect(
      policy.resolve({
        teamGrants: [
          {
            teamId: TEAM_A_ID,
            accessLevel: WorkspaceAccessLevel.FULL,
            override: { accessLevel: null, excluded: true },
          },
          { teamId: TEAM_B_ID, accessLevel: WorkspaceAccessLevel.EDIT },
        ],
      }),
    ).toEqual({
      accessLevel: WorkspaceAccessLevel.EDIT,
      sources: [{ type: 'team', teamId: TEAM_B_ID }],
    });
  });

  it('keeps direct access when a team grant is excluded', () => {
    expect(
      policy.resolve({
        directMembership: {
          accessLevel: WorkspaceAccessLevel.USE,
          status: WorkspaceMemberStatus.ACTIVE,
        },
        teamGrants: [
          {
            teamId: TEAM_A_ID,
            accessLevel: WorkspaceAccessLevel.FULL,
            override: { accessLevel: null, excluded: true },
          },
        ],
      }),
    ).toEqual({
      accessLevel: WorkspaceAccessLevel.USE,
      sources: [{ type: 'direct' }],
    });
  });

  it('uses the highest access level while retaining every access source', () => {
    expect(
      policy.resolve({
        directMembership: {
          accessLevel: WorkspaceAccessLevel.USE,
          status: WorkspaceMemberStatus.ACTIVE,
        },
        teamGrants: [
          { teamId: TEAM_A_ID, accessLevel: WorkspaceAccessLevel.FULL },
        ],
        organizationVisible: true,
      }),
    ).toEqual({
      accessLevel: WorkspaceAccessLevel.FULL,
      sources: [
        { type: 'direct' },
        { type: 'team', teamId: TEAM_A_ID },
        { type: 'organization' },
      ],
    });
  });

  it('compares workspace roles by privilege', () => {
    expect(
      policy.hasMinimumAccessLevel(
        WorkspaceAccessLevel.EDIT,
        WorkspaceAccessLevel.USE,
      ),
    ).toBe(true);
    expect(
      policy.hasMinimumAccessLevel(
        WorkspaceAccessLevel.USE,
        WorkspaceAccessLevel.EDIT,
      ),
    ).toBe(false);
  });

  it('grants use access through organization visibility', () => {
    expect(policy.resolve({ organizationVisible: true })).toEqual({
      accessLevel: WorkspaceAccessLevel.USE,
      sources: [{ type: 'organization' }],
    });
  });
});
