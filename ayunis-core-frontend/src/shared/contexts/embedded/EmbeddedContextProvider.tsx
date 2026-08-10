import { useState, type ReactNode } from 'react';
import { EmbeddedContext } from './embeddedContext';

const STORAGE_KEY = 'ayunis:embedded';

function resolveEmbedded() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('embedded') === '1') {
    window.sessionStorage.setItem(STORAGE_KEY, '1');
    return true;
  }
  return window.sessionStorage.getItem(STORAGE_KEY) === '1';
}

export function EmbeddedContextProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [isEmbedded] = useState(resolveEmbedded);

  return (
    <EmbeddedContext.Provider value={isEmbedded}>
      {children}
    </EmbeddedContext.Provider>
  );
}
