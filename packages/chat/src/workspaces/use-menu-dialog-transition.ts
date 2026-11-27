import { useRef } from 'react';

/** Opens a dialog only after the menu closed, so focus does not return to it. */
export function useMenuDialogTransition() {
  const openDialog = useRef<(() => void) | null>(null);
  return {
    requestDialogOpen: (open: () => void) => {
      openDialog.current = open;
    },
    handleCloseAutoFocus: (event: Event) => {
      const open = openDialog.current;
      if (!open) return;
      openDialog.current = null;
      event.preventDefault();
      open();
    },
  };
}
