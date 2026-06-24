import { randomUUID } from 'crypto';
import { OrgRetentionPolicy } from './org-retention-policy.entity';

describe('OrgRetentionPolicy', () => {
  it('is disabled when retentionDays is null and has no cutoff', () => {
    const policy = new OrgRetentionPolicy({
      orgId: randomUUID(),
      retentionDays: null,
    });

    expect(policy.isEnabled()).toBe(false);
    expect(policy.cutoffFrom(new Date('2026-06-16T00:00:00.000Z'))).toBeNull();
  });

  it('computes the activity cutoff by subtracting retentionDays from now', () => {
    const policy = new OrgRetentionPolicy({
      orgId: randomUUID(),
      retentionDays: 90,
    });

    const cutoff = policy.cutoffFrom(new Date('2026-06-16T00:00:00.000Z'));

    expect(policy.isEnabled()).toBe(true);
    expect(cutoff?.toISOString()).toBe('2026-03-18T00:00:00.000Z');
  });
});
