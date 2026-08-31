import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

export interface PiiMaskEntry {
  /** Unique id of the mask dictionary entry. */
  id: string;
  /** Full token string, e.g. `{{pii:PERSON_NAME_1}}`. */
  token: string;
  /** The original value the token stands in for. */
  value: string;
  /** PII category enum value, e.g. `person_name`. */
  category: string;
  /** Whether the user manually unmasked this entry for the thread. */
  unmasked: boolean;
}

export type PiiUnmaskRequestHandler = (entry: PiiMaskEntry) => void;

interface PiiMaskContextValue {
  masks: ReadonlyMap<string, PiiMaskEntry>;
  onUnmaskRequest?: PiiUnmaskRequestHandler;
}

const EMPTY_CONTEXT: PiiMaskContextValue = { masks: new Map() };

const PiiMaskContext = createContext<PiiMaskContextValue>(EMPTY_CONTEXT);

interface PiiMaskProviderProps {
  readonly masks: readonly PiiMaskEntry[];
  /** When set, masked entries become clickable and request an unmask. */
  readonly onUnmaskRequest?: PiiUnmaskRequestHandler;
  readonly children: ReactNode;
}

/**
 * Provides the thread's PII mask dictionary (token → entry) to markdown and
 * plain-text renderers. Without a provider the dictionary is empty and
 * tokens render as literal text.
 */
export function PiiMaskProvider({
  masks,
  onUnmaskRequest,
  children,
}: PiiMaskProviderProps) {
  const value = useMemo(
    () => ({
      masks: new Map(masks.map((mask) => [mask.token, mask])),
      onUnmaskRequest,
    }),
    [masks, onUnmaskRequest],
  );
  return (
    <PiiMaskContext.Provider value={value}>{children}</PiiMaskContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook belongs with its provider by repo convention
export function usePiiMasks(): ReadonlyMap<string, PiiMaskEntry> {
  return useContext(PiiMaskContext).masks;
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook belongs with its provider by repo convention
export function usePiiUnmaskRequest(): PiiUnmaskRequestHandler | undefined {
  return useContext(PiiMaskContext).onUnmaskRequest;
}
