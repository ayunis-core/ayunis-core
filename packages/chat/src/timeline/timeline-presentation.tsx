import { createContext, useContext, type ReactNode } from 'react';
import { EMPTY_TOOL_CARDS, type ToolCards } from './tool-card-types';

export interface TimelinePresentation {
  readonly toolCards: ToolCards;
  readonly pendingIndicator?: ReactNode;
  readonly onCodeCopied?: () => void;
}

export const DEFAULT_TIMELINE_PRESENTATION: TimelinePresentation = {
  toolCards: EMPTY_TOOL_CARDS,
};

export const TimelinePresentationContext = createContext(
  DEFAULT_TIMELINE_PRESENTATION,
);

export function useTimelinePresentation() {
  const presentation = useContext(TimelinePresentationContext);
  return {
    toolCards: presentation.toolCards,
    onCodeCopied: presentation.onCodeCopied,
  };
}
