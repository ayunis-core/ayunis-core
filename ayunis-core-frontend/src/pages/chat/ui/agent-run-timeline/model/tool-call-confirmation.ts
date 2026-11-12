import { createContext, useContext } from 'react';
import type { ToolCallDecisionDto } from '@/shared/api';

export interface ToolCallConfirmation {
  /** No decision can be made while a run is active on the thread. */
  readonly canDecide: boolean;
  /** A decision the user made that has not been sent yet. */
  readonly decisionFor: (toolCallId: string) => ToolCallDecisionDto | undefined;
  readonly decide: (decision: ToolCallDecisionDto) => void;
}

const NO_CONFIRMATION: ToolCallConfirmation = {
  canDecide: false,
  decisionFor: () => undefined,
  decide: () => undefined,
};

export const ToolCallConfirmationContext =
  createContext<ToolCallConfirmation>(NO_CONFIRMATION);

export function useToolCallConfirmation(): ToolCallConfirmation {
  return useContext(ToolCallConfirmationContext);
}
