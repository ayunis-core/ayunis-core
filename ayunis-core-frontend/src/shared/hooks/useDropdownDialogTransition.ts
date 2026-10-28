import { useRef } from 'react';

export function useDropdownDialogTransition() {
  const openDialogRef = useRef<(() => void) | null>(null);

  function requestDialogOpen(openDialog: () => void) {
    openDialogRef.current = openDialog;
  }

  function handleCloseAutoFocus(event: Event) {
    const openDialog = openDialogRef.current;
    if (!openDialog) return;
    openDialogRef.current = null;
    event.preventDefault();
    openDialog();
  }

  return { requestDialogOpen, handleCloseAutoFocus };
}
