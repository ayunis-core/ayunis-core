import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSkillMarketplaceUrl } from './useSkillMarketplaceUrl';

const MARKETPLACE_URL = 'https://marketplace.ayunis.com/';

const mocks = vi.hoisted(() => ({
  config: { enabled: true, url: null as string | null },
  granted: [] as string[],
}));

vi.mock('./useMarketplaceConfig', () => ({
  useMarketplaceConfig: () => mocks.config,
}));

vi.mock('@/features/permissions', () => ({
  useMyPermissions: () => ({
    can: (permission: string) => mocks.granted.includes(permission),
  }),
}));

describe('useSkillMarketplaceUrl', () => {
  beforeEach(() => {
    mocks.config = { enabled: true, url: MARKETPLACE_URL };
    mocks.granted = ['install_marketplace_skills'];
  });

  it('returns the marketplace for members who may install skills', () => {
    const { result } = renderHook(() => useSkillMarketplaceUrl());

    expect(result.current).toBe(MARKETPLACE_URL);
  });

  it('hides the marketplace from members without install_marketplace_skills', () => {
    mocks.granted = ['manage_own_skills'];

    const { result } = renderHook(() => useSkillMarketplaceUrl());

    expect(result.current).toBeNull();
  });

  it('hides the marketplace when the platform has none configured', () => {
    mocks.config = { enabled: false, url: MARKETPLACE_URL };

    const { result } = renderHook(() => useSkillMarketplaceUrl());

    expect(result.current).toBeNull();
  });
});
