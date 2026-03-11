import React from 'react';
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

  const chatPane = (
    <div className={`flex flex-col h-full px-4 ${className}`}>
      {/* Chat Header - sticky at top, not scrollable */}
      <div className="flex-shrink-0 sticky top-0 z-10">{chatHeader}</div>

      {/* Chat Content Area - takes up remaining space with scrollable content */}
      <div
        className="flex-1 overflow-y-auto w-full max-w-[800px] mx-auto"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {chatContent}
      </div>

      {/* Chat Input Area - adjusts to content height */}
      <div className="flex-shrink-0 sticky bottom-0 z-10 bg-background w-full max-w-[800px] mx-auto">
        {chatInput}
      </div>
    </div>
  );

  if (!sidePanel) {
    return <div className="absolute inset-0">{chatPane}</div>;
  }

  return (
    <PanelGroup orientation="horizontal" className="absolute inset-0">
      <Panel defaultSize={50} minSize={30}>
        {chatPane}
      </Panel>
      <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors" />
      <Panel defaultSize={50} minSize={30}>
        {sidePanel}
      </Panel>
    </PanelGroup>
  );
};

export default ChatInterfaceLayout;
