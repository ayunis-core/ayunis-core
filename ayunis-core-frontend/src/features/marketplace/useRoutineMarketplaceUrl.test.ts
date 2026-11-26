import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRoutineMarketplaceUrl } from './useRoutineMarketplaceUrl';

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

describe('useRoutineMarketplaceUrl', () => {
  beforeEach(() => {
    mocks.config = { enabled: true, url: 'https://marketplace.ayunis.com' };
    mocks.granted = ['manage_routines', 'install_marketplace_routines'];
  });

  it("links to the marketplace's routines listing", () => {
    const { result } = renderHook(() => useRoutineMarketplaceUrl());

    expect(result.current).toBe('https://marketplace.ayunis.com/routines');
  });

  it('does not double the slash when the marketplace URL ends with one', () => {
    mocks.config = { enabled: true, url: 'https://marketplace.ayunis.com/' };

    const { result } = renderHook(() => useRoutineMarketplaceUrl());

    expect(result.current).toBe('https://marketplace.ayunis.com/routines');
  });

  it('hides the marketplace when the platform has none configured', () => {
    mocks.config = { enabled: false, url: 'https://marketplace.ayunis.com' };

    const { result } = renderHook(() => useRoutineMarketplaceUrl());

    expect(result.current).toBeNull();
  });

  it.each([['manage_routines'], ['install_marketplace_routines']])(
    'hides the marketplace from members who only hold %s',
    (permission) => {
      mocks.granted = [permission];

      const { result } = renderHook(() => useRoutineMarketplaceUrl());

      expect(result.current).toBeNull();
    },
  );
});
