import type { UUID } from 'crypto';
import { CreditLimit } from './credit-limit.entity';
import { CreditLimitScope } from './value-objects/credit-limit-scope.enum';

describe('CreditLimit', () => {
  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const userId = '22222222-2222-2222-2222-222222222222' as UUID;
  const teamId = '33333333-3333-3333-3333-333333333333' as UUID;

  it('forUser produces a USER-scoped limit bound to the user with no team target', () => {
    const limit = CreditLimit.forUser(orgId, userId, 5000);

    expect(limit.scope).toBe(CreditLimitScope.USER);
    expect(limit.targetUserId).toBe(userId);
    expect(limit.targetTeamId).toBeNull();
    expect(limit.monthlyCredits).toBe(5000);
    expect(limit.orgId).toBe(orgId);
  });

  it('forTeam produces a TEAM-scoped limit bound to the team with no user target', () => {
    const limit = CreditLimit.forTeam(orgId, teamId, 20000);

    expect(limit.scope).toBe(CreditLimitScope.TEAM);
    expect(limit.targetTeamId).toBe(teamId);
    expect(limit.targetUserId).toBeNull();
    expect(limit.monthlyCredits).toBe(20000);
  });

  it('generates a stable id and timestamps when none are provided', () => {
    const limit = CreditLimit.forUser(orgId, userId, 0);

    expect(limit.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(limit.createdAt).toBeInstanceOf(Date);
    expect(limit.updatedAt).toBeInstanceOf(Date);
  });

  it('preserves persisted identity and timestamps when rehydrated', () => {
    const id = '44444444-4444-4444-4444-444444444444' as UUID;
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-02-01T00:00:00.000Z');

    const limit = new CreditLimit({
      id,
      orgId,
      scope: CreditLimitScope.TEAM,
      targetTeamId: teamId,
      monthlyCredits: 100,
      createdAt,
      updatedAt,
    });

    expect(limit.id).toBe(id);
    expect(limit.createdAt).toBe(createdAt);
    expect(limit.updatedAt).toBe(updatedAt);
    expect(limit.targetUserId).toBeNull();
  });
});
