import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getModeValue } from '@/widgets/model-select-options/lib/model-modes';
import { useModeSelection } from './useModeSelection';

describe(useModeSelection.name, () => {
  it('shows a picked model right away instead of snapping back', () => {
    const { result, rerender } = renderHook(
      ({ serverValue, isSaving }) => useModeSelection(serverValue, isSaving),
      { initialProps: { serverValue: getModeValue('auto'), isSaving: false } },
    );

    act(() => result.current.select('model-b'));
    expect(result.current.selectedValue).toBe('model-b');

    rerender({ serverValue: getModeValue('auto'), isSaving: true });
    expect(result.current.selectedValue).toBe('model-b');
  });

  it('follows the server value once saving has finished', () => {
    const { result, rerender } = renderHook(
      ({ serverValue, isSaving }) => useModeSelection(serverValue, isSaving),
      { initialProps: { serverValue: 'model-a', isSaving: false } },
    );

    act(() => result.current.select('model-b'));
    rerender({ serverValue: 'model-a', isSaving: true });
    rerender({ serverValue: 'model-a', isSaving: false });

    expect(result.current.selectedValue).toBe('model-a');
  });

  it('keeps a chosen mode, which is not saved yet', () => {
    const { result, rerender } = renderHook(
      ({ serverValue, isSaving }) => useModeSelection(serverValue, isSaving),
      { initialProps: { serverValue: 'model-a', isSaving: false } },
    );

    act(() => result.current.select(getModeValue('max')));
    rerender({ serverValue: 'model-a', isSaving: true });
    rerender({ serverValue: 'model-a', isSaving: false });

    expect(result.current.selectedValue).toBe(getModeValue('max'));
  });
});
