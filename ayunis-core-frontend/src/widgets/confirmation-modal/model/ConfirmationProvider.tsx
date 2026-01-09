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
    // Note: options are kept until next showConfirmation to allow Dialog content
    // to remain rendered during close animation.
    // Pointer-events cleanup is now handled centrally by the Dialog component.
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
