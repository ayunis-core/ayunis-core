import React, { useCallback } from 'react';
import { cn } from '@ayunis/ui/lib/cn';
import { useAutoScroll } from '@/features/useAutoScroll';
import { useContentScrollHeader } from '@/features/useContentScrollHeader';
import { useEmbedded } from '@/shared/contexts/embedded/useEmbedded';
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from 'react-resizable-panels';

interface ChatInterfaceLayoutProps {
  chatHeader: React.ReactNode;
  chatContent: React.ReactNode;
  chatInput: React.ReactNode;
  sidePanel?: React.ReactNode;
  className?: string;
  resetKey?: unknown;
}

export const ChatInterfaceLayout: React.FC<ChatInterfaceLayoutProps> = ({
  chatHeader,
  chatContent,
  chatInput,
  sidePanel,
  className = '',
  resetKey,
}) => {
  const { scrollRef: autoScrollRef, handleScroll } = useAutoScroll(
    chatContent,
    resetKey,
  );
  const {
    scrollRef: headerScrollRef,
    headerScrolled,
    onScroll: onHeaderScroll,
  } = useContentScrollHeader(resetKey);

  const setScrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      autoScrollRef.current = node;
      headerScrollRef.current = node;
    },
    [autoScrollRef, headerScrollRef],
  );

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      handleScroll(e);
      onHeaderScroll(e);
    },
    [handleScroll, onHeaderScroll],
  );

  const isEmbedded = useEmbedded();
  const railClass = cn(
    'mx-auto w-full max-w-[800px] px-4',
    isEmbedded && 'px-5',
  );

  const chatPane = (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-t-xl pb-4 ${className}`}
    >
      <div className="content-scroll-region relative flex min-h-0 flex-1 flex-col">
        <div
          className="content-scroll-viewport min-h-0 flex-1 overflow-x-hidden overflow-y-auto w-full"
          ref={setScrollRef}
          onScroll={onScroll}
        >
          <div className="content-scroll-header-offset" aria-hidden />
          <div className={railClass}>{chatContent}</div>
        </div>
        <div
          className="content-scroll-header"
          data-scrolled={headerScrolled ? 'true' : 'false'}
        >
          {chatHeader}
        </div>
      </div>

      <div
        className={cn(
          railClass,
          'flex-shrink-0 sticky bottom-0 z-10 bg-background',
        )}
      >
        {chatInput}
      </div>
    </div>
  );

  return (
    <PanelGroup orientation="horizontal" className="absolute inset-0">
      <Panel defaultSize={sidePanel ? 50 : 100} minSize={30}>
        {chatPane}
      </Panel>
      {sidePanel && (
        <>
          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors" />
          <Panel defaultSize={50} minSize={30}>
            {sidePanel}
          </Panel>
        </>
      )}
    </PanelGroup>
  );
};

export default ChatInterfaceLayout;
