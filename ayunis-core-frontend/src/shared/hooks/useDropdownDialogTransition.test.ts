import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDropdownDialogTransition } from './useDropdownDialogTransition';

describe('useDropdownDialogTransition', () => {
  it('opens the requested dialog after dropdown focus restoration begins', () => {
    const openDialog = vi.fn();
    const preventDefault = vi.fn();
    const { result } = renderHook(() => useDropdownDialogTransition());

    act(() => result.current.requestDialogOpen(openDialog));
    act(() =>
      result.current.handleCloseAutoFocus({
        preventDefault,
      } as unknown as Event),
    );

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(openDialog).toHaveBeenCalledOnce();
  });

  it('allows normal focus restoration when no dialog was requested', () => {
    const openDialog = vi.fn();
    const preventDefault = vi.fn();
    const { result } = renderHook(() => useDropdownDialogTransition());

    act(() =>
      result.current.handleCloseAutoFocus({
        preventDefault,
      } as unknown as Event),
    );

    expect(preventDefault).not.toHaveBeenCalled();
    expect(openDialog).not.toHaveBeenCalled();
  });
});
