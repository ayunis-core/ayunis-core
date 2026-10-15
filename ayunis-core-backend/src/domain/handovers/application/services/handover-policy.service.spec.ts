import { randomUUID } from 'crypto';
import { anOwnershipViewer } from 'src/domain/ownership/application/testing/ownership.fixtures';
import { HandoverRequest } from 'src/domain/handovers/domain/handover-request.entity';
import { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';
import { HandoverPolicy } from './handover-policy.service';

const policy = new HandoverPolicy();
const userId = randomUUID();
const orgId = randomUUID();
const ownTeam = randomUUID();
const otherTeam = randomUUID();
const SKILL = HandoverResourceType.SKILL;
const KNOWLEDGE = HandoverResourceType.KNOWLEDGE_BASE;

describe(HandoverPolicy.name, () => {
  it('lets members request their own teams and the organisation with the default rights', () => {
    const viewer = anOwnershipViewer({
      userId,
      orgId,
      memberTeamIds: [ownTeam],
      permissions: [
        Permission.REQUEST_SKILL_TRANSFER,
        Permission.REQUEST_SKILL_TRANSFER_ORG,
      ],
    });

    expect(
      policy.canRequest(viewer, SKILL, { type: 'team', teamId: ownTeam }),
    ).toBe(true);
    expect(
      policy.canRequest(viewer, SKILL, { type: 'team', teamId: otherTeam }),
    ).toBe(false);
    expect(policy.canRequest(viewer, SKILL, { type: 'org' })).toBe(true);
    expect(policy.canRequest(viewer, KNOWLEDGE, { type: 'org' })).toBe(false);
  });

  it('needs the other-teams right for teams the viewer is not in', () => {
    const viewer = anOwnershipViewer({
      userId,
      orgId,
      permissions: [Permission.REQUEST_SKILL_TRANSFER_OTHER_TEAMS],
    });

    expect(
      policy.canRequest(viewer, SKILL, { type: 'team', teamId: otherTeam }),
    ).toBe(true);
  });

  it('lets team admins review only their team and only with the review right', () => {
    const target = { type: 'team' as const, teamId: ownTeam };
    const withRight = anOwnershipViewer({
      userId,
      orgId,
      adminTeamIds: [ownTeam],
      teamAdminPermissions: [TeamAdminPermission.TEAM_REVIEW_REQUESTS],
    });
    const withoutRight = anOwnershipViewer({
      userId,
      orgId,
      adminTeamIds: [ownTeam],
    });

    expect(policy.canReview(withRight, SKILL, target)).toBe(true);
    expect(policy.canReview(withRight, SKILL, { type: 'org' })).toBe(false);
    expect(
      policy.canReview(withRight, SKILL, { type: 'team', teamId: otherTeam }),
    ).toBe(false);
    expect(policy.canReview(withoutRight, SKILL, target)).toBe(false);
  });

  it('keeps the review-all right separate per resource', () => {
    const viewer = anOwnershipViewer({
      userId,
      orgId,
      permissions: [Permission.REVIEW_ALL_SKILL_REQUESTS],
    });

    expect(policy.canReview(viewer, SKILL, { type: 'org' })).toBe(true);
    expect(policy.canReview(viewer, KNOWLEDGE, { type: 'org' })).toBe(false);
    expect(policy.canReviewAny(viewer, KNOWLEDGE)).toBe(false);
  });

  it('never reviews requests of another organisation', () => {
    const admin = anOwnershipViewer({ userId, orgId, isAdmin: true });
    const foreign = new HandoverRequest({
      orgId: randomUUID(),
      resourceType: SKILL,
      resourceId: randomUUID(),
      target: { type: 'org' },
      requestedByUserId: randomUUID(),
    });

    expect(policy.canReviewRequest(admin, foreign)).toBe(false);
  });
});
