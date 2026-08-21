import { describe, expect, it } from 'vitest';
import { isSsoAvailableForOrg } from '@/features/sso/lib/sso-discovery';

describe(isSsoAvailableForOrg.name, () => {
  const currentOrgId = 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4';

  it('accepts SSO only when discovery resolves to the current organization', () => {
    expect(
      isSsoAvailableForOrg(
        { available: true, orgId: currentOrgId },
        currentOrgId,
      ),
    ).toBe(true);
  });

  it.each([
    { available: false, orgId: currentOrgId },
    { available: true, orgId: '4653ee84-ef92-4efb-9bc6-3093d4863285' },
    { available: true },
  ])('rejects unavailable or cross-organization discovery', (discovery) => {
    expect(isSsoAvailableForOrg(discovery, currentOrgId)).toBe(false);
  });
});
