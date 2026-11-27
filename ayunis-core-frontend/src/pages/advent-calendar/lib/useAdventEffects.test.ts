import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdventEffects } from './useAdventEffects';

function prefersReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduce && query === '(prefers-reduced-motion: reduce)',
    })),
  );
}

describe('useAdventEffects', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with effects on by default', () => {
    prefersReducedMotion(false);
    const { result } = renderHook(() => useAdventEffects());
    expect(result.current.effectsOn).toBe(true);
  });

  it('starts with effects off when the system asks for reduced motion', () => {
    prefersReducedMotion(true);
    const { result } = renderHook(() => useAdventEffects());
    expect(result.current.effectsOn).toBe(false);
  });

  it('keeps effects switched off after a reload', () => {
    prefersReducedMotion(false);
    const first = renderHook(() => useAdventEffects());
    act(() => first.result.current.setEffectsOn(false));
    expect(first.result.current.effectsOn).toBe(false);
    first.unmount();

    const reloaded = renderHook(() => useAdventEffects());
    expect(reloaded.result.current.effectsOn).toBe(false);
  });

  it('keeps effects switched on despite reduced motion once chosen', () => {
    prefersReducedMotion(true);
    const first = renderHook(() => useAdventEffects());
    act(() => first.result.current.setEffectsOn(true));
    first.unmount();

    const reloaded = renderHook(() => useAdventEffects());
    expect(reloaded.result.current.effectsOn).toBe(true);
  });
});
