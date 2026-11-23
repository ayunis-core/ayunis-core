import { createContext, useContext } from 'react';
import type { ConfirmationOptions } from './types';

export interface ConfirmationContextType {
  showConfirmation: (options: ConfirmationOptions) => void;
  /**
   * Closes the confirmation; given the options it was shown with, only while
   * no other confirmation has replaced it.
   */
  hideConfirmation: (shown?: ConfirmationOptions) => void;
  isOpen: boolean;
  options: ConfirmationOptions | null;
}

export const ConfirmationContext =
  createContext<ConfirmationContextType | null>(null);

export function useConfirmationContext() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error(
      'useConfirmationContext must be used within a ConfirmationProvider',
    );
  }
  return context;
}
