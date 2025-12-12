import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ConfirmationOptions } from './types';
import { ConfirmationContext } from './useConfirmationContext';

interface ConfirmationProviderProps {
  children: ReactNode;
}

export function ConfirmationProvider({ children }: ConfirmationProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);

  function showConfirmation(confirmationOptions: ConfirmationOptions) {
    setOptions(confirmationOptions);
    setIsOpen(true);
  }

  function hideConfirmation() {
    setIsOpen(false);

    // Force cleanup of Radix's pointer-events on body
    // Radix Dialog has a bug where it doesn't always remove this
    const cleanup = () => {
      document.body.style.pointerEvents = '';
    };

    // Run cleanup after delays to catch when Radix adds it
    setTimeout(cleanup, 0);
    setTimeout(cleanup, 100);
    setTimeout(cleanup, 300);
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
