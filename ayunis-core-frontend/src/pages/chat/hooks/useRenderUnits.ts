import { useMemo, useState } from 'react';
import { replaceEqualDeep } from '@tanstack/react-query';
import type { Message } from '@/pages/chat/model/openapi';
import {
  groupMessagesIntoRuns,
  type RenderUnit,
} from '@/pages/chat/ui/agent-run-timeline';

interface RenderUnitOptions {
  isStreaming: boolean;
  hasPendingUserTurn: boolean;
}

export function useRenderUnits(
  messages: readonly Message[],
  { isStreaming, hasPendingUserTurn }: RenderUnitOptions,
): RenderUnit[] {
  const grouped = useMemo(
    () => groupMessagesIntoRuns(messages, { isStreaming, hasPendingUserTurn }),
    [messages, isStreaming, hasPendingUserTurn],
  );
  // Grouping rebuilds every unit; reusing the previous objects for unchanged
  // units and blocks lets memoized run blocks skip re-rendering them.
  const [shared, setShared] = useState({ grouped, units: grouped });
  if (shared.grouped === grouped) return shared.units;
  const units = replaceEqualDeep(shared.units, grouped);
  setShared({ grouped, units });
  return units;
}
