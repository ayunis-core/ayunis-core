import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachGridClipboardWrite } from './grid-clipboard';

function emit<T>(target: Element, type: string, detail: T): CustomEvent<T> {
  const event = new CustomEvent(type, {
    detail,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

function startCopy(target: Element, setData: DataTransfer['setData']): void {
  const clipboardData = { setData } as DataTransfer;
  emit(target, 'beforecopy', { event: { clipboardData } as ClipboardEvent });
}

describe('attachGridClipboardWrite', () => {
  let grid: HTMLElement;
  let clipboard: HTMLElement;
  let detach: () => void;
  const clearRegion = vi.fn();

  beforeEach(() => {
    grid = document.createElement('div');
    clipboard = document.createElement('div');
    grid.appendChild(clipboard);
    clipboard.addEventListener('clearregion', clearRegion);
    clearRegion.mockClear();
    detach = attachGridClipboardWrite(grid);
  });

  afterEach(() => detach());

  it('writes the copied range as tab/newline separated text while the clipboard event is live', () => {
    const setData = vi.fn();
    startCopy(clipboard, setData);
    emit(clipboard, 'clipboardrangecopy', {
      data: [
        ['a1', 'b1'],
        ['a2', null],
      ],
    });

    expect(setData).toHaveBeenCalledWith('text/plain', 'a1\tb1\na2\t');
  });

  it('ignores the native beforecopy event Chromium fires before the copy', () => {
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      errors.push(event.error);
      event.preventDefault();
    };
    window.addEventListener('error', onError);
    const setData = vi.fn();

    clipboard.dispatchEvent(new Event('beforecopy', { bubbles: true }));
    startCopy(clipboard, setData);
    emit(clipboard, 'clipboardrangecopy', { data: [['a1']] });
    window.removeEventListener('error', onError);

    expect(errors).toEqual([]);
    expect(setData).toHaveBeenCalledWith('text/plain', 'a1');
  });

  it("cancels RevoGrid's deferred clipboard write", () => {
    const applied = emit(clipboard, 'beforecopyapply', { data: [['a1']] });

    expect(applied.defaultPrevented).toBe(true);
  });

  it('lets a cut clear the range after the clipboard write succeeded', () => {
    startCopy(clipboard, vi.fn());
    emit(clipboard, 'clipboardrangecopy', { data: [['a1']] });
    emit(clipboard, 'clearregion', undefined);

    expect(clearRegion).toHaveBeenCalledOnce();
  });

  it('keeps the cut range when the clipboard rejects the write', () => {
    startCopy(clipboard, () => {
      throw new DOMException(
        'Modifications are not allowed for this document',
        'NoModificationAllowedError',
      );
    });

    expect(() =>
      emit(clipboard, 'clipboardrangecopy', { data: [['a1']] }),
    ).not.toThrow();
    emit(clipboard, 'clearregion', undefined);

    expect(clearRegion).not.toHaveBeenCalled();
  });

  it('keeps the cut range when no clipboard is available', () => {
    emit(clipboard, 'beforecopy', { event: {} as ClipboardEvent });
    emit(clipboard, 'clipboardrangecopy', { data: [['a1']] });
    emit(clipboard, 'clearregion', undefined);

    expect(clearRegion).not.toHaveBeenCalled();
  });

  it('does not reuse a previous successful write for a later cut', () => {
    startCopy(clipboard, vi.fn());
    emit(clipboard, 'clipboardrangecopy', { data: [['a1']] });
    startCopy(clipboard, () => {
      throw new DOMException('denied', 'NoModificationAllowedError');
    });
    emit(clipboard, 'clipboardrangecopy', { data: [['a1']] });
    emit(clipboard, 'clearregion', undefined);

    expect(clearRegion).not.toHaveBeenCalled();
  });

  it('stops intercepting once detached', () => {
    detach();
    const applied = emit(clipboard, 'beforecopyapply', { data: [['a1']] });
    emit(clipboard, 'clearregion', undefined);

    expect(applied.defaultPrevented).toBe(false);
    expect(clearRegion).toHaveBeenCalledOnce();
  });
});
