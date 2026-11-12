import { useCallback, useMemo, useRef, useState } from 'react';
import type { ToolCallDecisionDto } from '@/shared/api';
import type { Message } from '@/pages/chat/model/openapi';
import type { ToolCallConfirmation } from '@/pages/chat/ui/agent-run-timeline';
import { findCallsAwaitingConfirmation } from '@/pages/chat/lib/calls-awaiting-confirmation';

interface UseToolCallDecisionsParams {
  messages: readonly Message[];
  isStreaming: boolean;
  sendDecisions: (decisions: ToolCallDecisionDto[]) => Promise<void>;
}

/** The decisions made on the calls one turn awaits, until they are sent. */
interface TurnDecisions {
  /** The IDs of the calls the turn awaits. */
  turn: string;
  decisions: ReadonlyMap<string, ToolCallDecisionDto>;
  isSending: boolean;
}

const NO_DECISIONS: TurnDecisions = {
  turn: '',
  decisions: new Map(),
  isSending: false,
};

/**
 * Collects the user's decisions on the calls awaiting confirmation and sends
 * them in one request once every call of the turn is decided: the run only
 * continues with a decision for each of them.
 */
export function useToolCallDecisions({
  messages,
  isStreaming,
  sendDecisions,
}: UseToolCallDecisionsParams): ToolCallConfirmation {
  const awaitingIds = useMemo(
    () => findCallsAwaitingConfirmation(messages),
    [messages],
  );
  const turn = awaitingIds.join(' ');
  const [state, setState] = useState(NO_DECISIONS);
  // Clicks can arrive before the chat re-renders, so the latest decisions
  // and whether they are being sent cannot come from the render.
  const latest = useRef(state);
  const update = useCallback((next: TurnDecisions) => {
    latest.current = next;
    setState(next);
  }, []);

  const decide = useCallback(
    (decision: ToolCallDecisionDto) => {
      const current = forTurn(latest.current, turn);
      if (isStreaming || current.isSending) return;
      if (!awaitingIds.includes(decision.toolCallId)) return;
      const decisions = new Map(current.decisions).set(
        decision.toolCallId,
        decision,
      );
      const isComplete = awaitingIds.every((id) => decisions.has(id));
      update({ turn, decisions, isSending: isComplete });
      if (!isComplete) return;
      // Reset however the run ends, since the send reports its own errors
      // and the refreshed thread shows the saved decisions. A turn the
      // continuation paused on again keeps the decisions made on it.
      const reset = () => {
        if (latest.current.turn === turn) update(NO_DECISIONS);
      };
      void sendDecisions(
        awaitingIds.flatMap((id) => decisions.get(id) ?? []),
      ).then(reset, reset);
    },
    [isStreaming, turn, awaitingIds, sendDecisions, update],
  );

  // Another run on the thread, such as a message sent instead, answers the
  // turn without these decisions.
  const shown = useMemo(() => forTurn(state, turn), [state, turn]);
  const isOtherRun = isStreaming && !shown.isSending;
  return useMemo(
    () => ({
      canDecide: !isStreaming,
      decisionFor: (toolCallId) =>
        isOtherRun ? undefined : shown.decisions.get(toolCallId),
      decide,
    }),
    [isStreaming, isOtherRun, shown, decide],
  );
}

function forTurn(state: TurnDecisions, turn: string): TurnDecisions {
  return state.turn === turn ? state : { ...NO_DECISIONS, turn };
}
