import type { RangeClipboardCopyEventProps } from '@revolist/react-datagrid';

function toClipboardText(data: RangeClipboardCopyEventProps['data']): string {
  return data.map((row) => row.join('\t')).join('\n');
}

/**
 * RevoGrid writes the clipboard from an async method, after the native
 * copy/cut event may have finished dispatching; Firefox then rejects the
 * write with NoModificationAllowedError while a cut has already cleared the
 * range. This writes the range synchronously during the event instead,
 * cancels RevoGrid's late write, and blocks the cut's clear when the write
 * did not happen so cut never loses data.
 */
export function attachGridClipboardWrite(grid: HTMLElement): () => void {
  let transfer: DataTransfer | null = null;
  let written = false;

  const onBeforeCopy = (event: CustomEvent<{ event: ClipboardEvent }>) => {
    // Chromium and Safari also dispatch a native, detail-less `beforecopy`
    // ClipboardEvent under the same name before the copy itself.
    if (!(event instanceof CustomEvent)) {
      return;
    }
    transfer = event.detail.event.clipboardData ?? null;
    written = false;
  };

  const onRangeCopy = (event: CustomEvent<RangeClipboardCopyEventProps>) => {
    try {
      transfer?.setData('text/plain', toClipboardText(event.detail.data));
      written = transfer !== null;
    } catch {
      written = false;
    }
    transfer = null;
  };

  const onBeforeCopyApply = (event: Event) => event.preventDefault();

  // Capture phase on the host runs before RevoGrid's own clear handler on
  // the inner clipboard element.
  const onClearRegion = (event: Event) => {
    if (!written) {
      event.stopPropagation();
    }
    written = false;
  };

  grid.addEventListener('beforecopy', onBeforeCopy as EventListener);
  grid.addEventListener('clipboardrangecopy', onRangeCopy as EventListener);
  grid.addEventListener('beforecopyapply', onBeforeCopyApply);
  grid.addEventListener('clearregion', onClearRegion, { capture: true });

  return () => {
    grid.removeEventListener('beforecopy', onBeforeCopy as EventListener);
    grid.removeEventListener(
      'clipboardrangecopy',
      onRangeCopy as EventListener,
    );
    grid.removeEventListener('beforecopyapply', onBeforeCopyApply);
    grid.removeEventListener('clearregion', onClearRegion, { capture: true });
  };
}
