import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { SourceCitation } from '@/widgets/markdown/lib/source-citation';

export type SourceCitationClickHandler = (citation: SourceCitation) => void;

const SourceCitationContext = createContext<
  SourceCitationClickHandler | undefined
>(undefined);

interface SourceCitationProviderProps {
  readonly onCitationClick?: SourceCitationClickHandler;
  readonly children: ReactNode;
}

export function SourceCitationProvider({
  onCitationClick,
  children,
}: SourceCitationProviderProps) {
  return (
    <SourceCitationContext.Provider value={onCitationClick}>
      {children}
    </SourceCitationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook belongs with its provider by repo convention
export function useSourceCitationClick():
  SourceCitationClickHandler | undefined {
  return useContext(SourceCitationContext);
}
