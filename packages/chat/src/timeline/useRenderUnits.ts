import { useMemo, useState } from 'react';
import { replaceEqualDeep } from '@tanstack/react-query';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import {
  groupMessagesIntoRuns,
  type GroupingOptions,
} from './group-messages-into-runs';
import type { RenderUnit } from './types';

type Message = GetThreadResponseDto['messages'][number];

export function useRenderUnits(
  messages: readonly Message[],
  { isStreaming, hasPendingUserTurn, toolCards }: GroupingOptions,
): RenderUnit[] {
  const grouped = useMemo(
    () =>
      groupMessagesIntoRuns(messages, {
        isStreaming,
        hasPendingUserTurn,
        toolCards,
      }),
    [messages, isStreaming, hasPendingUserTurn, toolCards],
  );
  // Grouping rebuilds every unit; reusing the previous objects for unchanged
  // units and blocks lets memoized run blocks skip re-rendering them.
  const [shared, setShared] = useState({ grouped, units: grouped });
  if (shared.grouped === grouped) return shared.units;
  const units = replaceEqualDeep(shared.units, grouped);
  setShared({ grouped, units });
  return units;
}
