import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ConfirmationOptions } from './types';
import { ConfirmationContext } from './useConfirmationContext';

interface ConfirmationProviderProps {
  children: ReactNode;
}

export function ConfirmationProvider({
  children,
}: Readonly<ConfirmationProviderProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const shownRef = useRef<ConfirmationOptions | null>(null);

  function showConfirmation(confirmationOptions: ConfirmationOptions) {
    shownRef.current = confirmationOptions;
    setOptions(confirmationOptions);
    setIsOpen(true);
  }

  function hideConfirmation(shown?: ConfirmationOptions) {
    // A confirmation's callbacks may ask the next question, which must stay
    // open when the answered one closes.
    if (shown && shownRef.current !== shown) return;
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
