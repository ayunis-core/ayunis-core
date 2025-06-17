import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { ConfirmationOptions } from "./types";

interface ConfirmationContextType {
  showConfirmation: (options: ConfirmationOptions) => void;
  hideConfirmation: () => void;
  isOpen: boolean;
  options: ConfirmationOptions | null;
}

const ConfirmationContext = createContext<ConfirmationContextType | null>(null);

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
    setOptions(null);
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

export function useConfirmationContext() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error(
      "useConfirmationContext must be used within a ConfirmationProvider",
    );
  }
  return context;
}
