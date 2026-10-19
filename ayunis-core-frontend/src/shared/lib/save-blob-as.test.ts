import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveBlobAs } from './save-blob-as';

const createObjectURL = vi.fn(() => 'blob:certificate');
const revokeObjectURL = vi.fn();

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('saveBlobAs', () => {
  it('keeps the download URL available until the next event-loop turn', () => {
    vi.useFakeTimers();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('certificate.pdf');
      expect(this.href).toBe('blob:certificate');
      expect(this.isConnected).toBe(true);
    });
    const pdf = new Blob(['%PDF'], { type: 'application/pdf' });
    saveBlobAs(pdf, 'certificate.pdf');
    expect(createObjectURL).toHaveBeenCalledWith(pdf);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:certificate');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
