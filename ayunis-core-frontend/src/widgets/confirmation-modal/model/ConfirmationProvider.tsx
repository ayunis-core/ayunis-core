import { useState, useRef } from 'react';
import type { ReactNode } from 'react';
import type { ConfirmationOptions } from './types';
import { ConfirmationContext } from './useConfirmationContext';

interface ConfirmationProviderProps {
  children: ReactNode;
}

export function ConfirmationProvider({ children }: ConfirmationProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const cleanupTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function cancelPendingCleanups() {
    cleanupTimeoutsRef.current.forEach(clearTimeout);
    cleanupTimeoutsRef.current = [];
  }

  function showConfirmation(confirmationOptions: ConfirmationOptions) {
    // Cancel any pending cleanups from a previous modal
    cancelPendingCleanups();
    setOptions(confirmationOptions);
    setIsOpen(true);
  }

  function hideConfirmation() {
    setIsOpen(false);

    // Cancel any existing cleanup timeouts before scheduling new ones
    cancelPendingCleanups();

    // Force cleanup of Radix's pointer-events on body
    // Radix Dialog has a bug where it doesn't always remove this
    const cleanup = () => {
      // Only cleanup if no dialog is currently open
      if (!document.querySelector('[data-radix-dialog-content]')) {
        document.body.style.pointerEvents = '';
      }
    };

    // Run cleanup after delays to catch when Radix adds it
    // Store timeout IDs so they can be cancelled if needed
    cleanupTimeoutsRef.current = [
      setTimeout(cleanup, 0),
      setTimeout(cleanup, 100),
      setTimeout(cleanup, 300),
    ];
  }

  return (
    <ConfirmationContext.Provider
      value={{
        showConfirmation,
        hideConfirmation,
        isOpen,
        options,
      }}
    >
      {children}
    </ConfirmationContext.Provider>
  );
}
