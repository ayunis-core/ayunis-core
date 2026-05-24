import React, { useCallback, useEffect, useState } from 'react';
import { useAutoScroll } from '@/features/useAutoScroll';
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
}

export const ChatInterfaceLayout: React.FC<ChatInterfaceLayoutProps> = ({
  chatHeader,
  chatContent,
  chatInput,
  sidePanel,
  className = '',
}) => {
  const { scrollRef, handleScroll } = useAutoScroll(chatContent);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      handleScroll(e);
      setHeaderScrolled(e.currentTarget.scrollTop > 0);
    },
    [handleScroll],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      setHeaderScrolled(el.scrollTop > 0);
    }
  }, [chatContent, scrollRef]);

  const chatPane = (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-t-xl px-4 pb-4 ${className}`}
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto w-full"
          ref={scrollRef}
          onScroll={onScroll}
        >
          <div className="chat-scroll-header-offset" aria-hidden />
          <div className="mx-auto w-full max-w-[800px]">{chatContent}</div>
        </div>
        <div
          className="chat-scroll-header"
          data-scrolled={headerScrolled ? 'true' : 'false'}
        >
          {chatHeader}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[800px] flex-shrink-0 sticky bottom-0 z-10 bg-background">
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
