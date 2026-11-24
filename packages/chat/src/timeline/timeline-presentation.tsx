import {
  createContext,
  useContext,
  type ComponentType,
  type ReactNode,
} from 'react';
import { Markdown, type MarkdownProps } from '@ayunis/chat/markdown';
import { EMPTY_TOOL_CARDS, type ToolCards } from './tool-card-types';

export interface TimelinePresentation {
  readonly toolCards: ToolCards;
  readonly Markdown?: ComponentType<MarkdownProps>;
  readonly pendingIndicator?: ReactNode;
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
    Markdown: presentation.Markdown ?? Markdown,
  };
}
