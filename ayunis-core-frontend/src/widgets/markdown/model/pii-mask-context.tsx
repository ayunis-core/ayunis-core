import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

export interface PiiMaskEntry {
  /** Full token string, e.g. `{{pii:PERSON_NAME_1}}`. */
  token: string;
  /** The original value the token stands in for. */
  value: string;
  /** PII category enum value, e.g. `person_name`. */
  category: string;
}

const EMPTY_MASKS: ReadonlyMap<string, PiiMaskEntry> = new Map();

const PiiMaskContext =
  createContext<ReadonlyMap<string, PiiMaskEntry>>(EMPTY_MASKS);

interface PiiMaskProviderProps {
  readonly masks: readonly PiiMaskEntry[];
  readonly children: ReactNode;
}

/**
 * Provides the thread's PII mask dictionary (token → entry) to markdown and
 * plain-text renderers. Without a provider the dictionary is empty and
 * tokens render as literal text.
 */
export function PiiMaskProvider({ masks, children }: PiiMaskProviderProps) {
  const map = useMemo(
    () => new Map(masks.map((mask) => [mask.token, mask])),
    [masks],
  );
  return (
    <PiiMaskContext.Provider value={map}>{children}</PiiMaskContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook belongs with its provider (repo convention, see shared/ui/shadcn)
export function usePiiMasks(): ReadonlyMap<string, PiiMaskEntry> {
  return useContext(PiiMaskContext);
}
